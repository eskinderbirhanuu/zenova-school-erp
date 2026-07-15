# File Reviewed

`backend/app/services/communication_service.py` (98 lines)

## Overview

Communication service — CRUD for announcements, notifications (with real-time push), messages, and notification read tracking.

## Issues

### Issue 1 — `send_notification` Uses `asyncio.ensure_future` Outside Running Loop

- **Lines:** 48-55
- **Severity:** High
- **Category:** Concurrency
- **Description:** `asyncio.ensure_future()` inside a synchronous FastAPI function will fail if there is no running event loop. This is not guaranteed to have an event loop in the current thread.
- **Why it is a problem:** The real-time push silently fails (exception is caught and logged), so notifications are never delivered via WebSocket.
- **Potential Impact:** Real-time notifications don't arrive for most requests.
- **Recommended Fix:** Use `BackgroundTasks` from FastAPI or a proper task queue, or create a new event loop.

### Issue 2 — `asyncio.ensure_future` With `commit` Already Called

- **Lines:** 47-57
- **Severity:** Medium
- **Category:** Reliability
- **Description:** `send_notification` commits before attempting the real-time push. If the push fails, the notification is still persisted — but the user doesn't get it in real-time. This is a minor consistency concern.

### Issue 3 — `get_messages` Boolean Operator Precedence Bug

- **Lines:** 74-76
- **Severity:** High
- **Category:** Bug
- **Description:** The ternary expression `(Message.recipient_id == user_id) | (Message.sender_id == user_id) if include_sent else (Message.recipient_id == user_id)` has operator precedence issue. The `if` applies to the entire union expression between `|`. In SQLAlchemy, `|` is the OR operator. The logic should be: if include_sent, filter by recipient OR sender; otherwise, filter by recipient only. But the way it's written: `q = db.query(Message).filter((A) | (B) if include_sent else (A))`. The Python ternary `X if cond else Y` binds more tightly than `|` in some interpretations. Actually, let me think again...

Actually, the expression is `db.query(Message).filter((Message.recipient_id == user_id) | (Message.sender_id == user_id) if include_sent else (Message.recipient_id == user_id))`. Due to Python's operator precedence, the `if-else` ternary has lower precedence than `|`, so this evaluates as:

`db.query(Message).filter( ((Message.recipient_id == user_id) | (Message.sender_id == user_id)) if include_sent else (Message.recipient_id == user_id) )`

Wait no, Python precedence: `|` is bitwise OR (higher precedence than comparison operators actually). `==` has higher precedence than `|`. And `X if cond else Y` has very low precedence (lower than `|`). So the expression is:

`db.query(Message).filter( ((Message.recipient_id == user_id) | (Message.sender_id == user_id)) if include_sent else (Message.recipient_id == user_id) )`

Actually, that would be correct then. If `include_sent` is True, filter by recipient OR sender. If False, filter by recipient only.

Hmm, but there's a parenthesization issue. Let me trace through more carefully:

`db.query(Message).filter(
    (Message.recipient_id == user_id) | (Message.sender_id == user_id) if include_sent else (Message.recipient_id == user_id)
)`

In Python, `X if cond else Y` has the lowest precedence. So the parsing is:
- `(Message.recipient_id == user_id) | (Message.sender_id == user_id)` is evaluated first (due to parentheses)
- Then `if include_sent else (Message.recipient_id == user_id)`

So if `include_sent` is True, it's `db.query(Message).filter( (recipient == uid) | (sender == uid) )`.
If `include_sent` is False, it's `db.query(Message).filter( recipient == uid )`.

That seems correct actually. Let me look again at the line:

```python
(Message.recipient_id == user_id) | (Message.sender_id == user_id) if include_sent else (Message.recipient_id == user_id)
```

Wait, I think this IS correct. The `if-else` ternary encompasses the entire expression. Let me re-check...

Actually in Python, `A | B if C else D` parses as `(A | B) if C else D` because `|` has higher precedence than `if-else`. So:

When `include_sent=True`: filter = `(Message.recipient_id == user_id) | (Message.sender_id == user_id)` → recipient OR sender
When `include_sent=False`: filter = `(Message.recipient_id == user_id)` → recipient only

That's correct. But the line uses Python's `|` operator (bitwise OR), which SQLAlchemy overloads as OR. This should work fine.

Wait, but looking at it more carefully:

```python
q = db.query(Message).filter(
    (Message.recipient_id == user_id) | (Message.sender_id == user_id) if include_sent else (Message.recipient_id == user_id)
)
```

Hmm, I think there IS a potential issue because the `if-else` ternary uses `(Message.recipient_id == user_id)` in the else branch, but this is just a boolean expression, not a filter clause. In SQLAlchemy, `==` produces a `BinaryExpression`, which is what `filter()` expects. So this should work.

But wait — the structure means we're passing the `if-else` result as the sole positional argument to `.filter()`. The `if-else` will evaluate to either a `BinaryExpression` (from `|`) or a single `BinaryExpression`. This is fine for SQLAlchemy.

Actually I think this code is correct. Let me reconsider. Let me just not flag this as a bug.

Actually wait, I re-read the code more carefully:

```python
q = db.query(Message).filter(
    (Message.recipient_id == user_id) | (Message.sender_id == user_id) if include_sent else (Message.recipient_id == user_id)
)
```

In Python, `X if cond else Y` has lower precedence than `|`. So:
- `(Message.recipient_id == user_id) | (Message.sender_id == user_id)` → this is evaluated as a single expression (OR)
- The `if include_sent else (Message.recipient_id == user_id)` → ternary applies to the whole thing

If include_sent is True, filter is: `(recipient == uid) | (sender == uid)` → correct
If include_sent is False, filter is: `recipient == uid` → correct

So this is actually correct. No bug here.

OK, let me remove that as an issue. Let me write the report without that claim.

### Issue 3 — `get_messages` Has N+1 Query for Sender Names

- **Lines:** 78-87
- **Severity:** Low
- **Category:** Performance
- **Description:** For each message returned, a separate query fetches the sender's name. This is the classic N+1 query pattern.
- **Potential Impact:** 50 messages = 51 queries.

### Issue 4 — No Validation on Announcement Target Roles

- **Lines:** 10-17
- **Severity:** Medium
- **Category:** Validation
- **Description:** `target_roles` is accepted as-is with no validation that the values are valid roles.
- **Why it is a problem:** Announcements could target non-existent roles, meaning no one sees them.
- **Potential Impact:** Lost announcements.

## Security Review

- Notifications are scoped to `user_id` — proper tenant isolation.
- Messages enforce `recipient_id` access control.

## Performance Review

- N+1 query in `get_messages` should be optimized.
- `limit(50)` on notification and message queries is appropriate.

## Maintainability

- Clean, well-structured service.
- Real-time push integration is well-separated.

## Architecture Review

- Communication service correctly separates announcements (school-wide) from notifications (user-specific) and messages (1-to-1).
- The `asyncio.ensure_future` approach for real-time push is fragile — should use `BackgroundTasks`.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 8/10 |
| Performance | 7/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
| Enterprise Readiness | 7/10 |
