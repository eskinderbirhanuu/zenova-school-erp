<?php
// ZENOVA Setup Wizard
// Run: php -S 0.0.0.0:8080
$step = $_GET['step'] ?? 1;
$error = '';
$success = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $step = $_POST['step'] ?? 1;

    if ($step == 1) {
        $license = $_POST['license_key'] ?? '';
        $school_id = $_POST['school_id'] ?? '';
        if (!str_starts_with($license, 'ZNV-')) {
            $error = 'Invalid license key format. Should start with ZNV-';
        } else {
            $step = 2;
        }
    } elseif ($step == 2) {
        $db_pass = $_POST['db_password'] ?? '';
        $secret = $_POST['secret_key'] ?? '';
        if (strlen($secret) < 32) {
            $error = 'Secret key must be at least 32 characters';
        } elseif (strlen($db_pass) < 8) {
            $error = 'Database password must be at least 8 characters';
        } else {
            // Write .env
            $env = "# ZENOVA School ERP .env\n";
            $env .= "ZENOVA_LICENSE_KEY={$_POST['license_key']}\n";
            $env .= "ZENOVA_LICENSE_SERVER={$_POST['license_server']}\n";
            $env .= "SCHOOL_ID={$_POST['school_id']}\n";
            $env .= "SECRET_KEY=$secret\n";
            $env .= "DB_PASSWORD=$db_pass\n";
            $env .= "ENVIRONMENT=production\n";
            file_put_contents(__DIR__ . '/../.env', $env);
            $success = 'Configuration saved! Run: docker compose up -d';
            $step = 3;
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ZENOVA Setup Wizard</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: system-ui, -apple-system, sans-serif; background: #f3f4f6; display: flex; min-height: 100vh; align-items: center; justify-content: center; }
.card { background: white; border-radius: 16px; padding: 40px; width: 480px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; color: #1e3a5f; }
.subtitle { font-size: 14px; color: #6b7280; margin-bottom: 24px; }
.steps { display: flex; gap: 8px; margin-bottom: 32px; }
.step { width: 32px; height: 4px; border-radius: 2px; background: #e5e7eb; }
.step.active { background: #2563eb; }
.step.done { background: #16a34a; }
label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 6px; color: #374151; }
input { width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; margin-bottom: 16px; }
input:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
button { width: 100%; padding: 12px; background: #2563eb; color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; }
button:hover { background: #1d4ed8; }
.error { background: #fef2f2; color: #dc2626; padding: 10px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }
.success { background: #f0fdf4; color: #16a34a; padding: 10px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }
code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
</style>
</head>
<body>
<div class="card">
    <h1>🚀 ZENOVA School ERP</h1>
    <p class="subtitle">Setup Wizard — Step <?= $step ?> of 3</p>

    <div class="steps">
        <div class="step <?= $step >= 2 ? 'done' : 'active' ?>"></div>
        <div class="step <?= $step >= 3 ? 'done' : ($step == 2 ? 'active' : '') ?>"></div>
        <div class="step <?= $step == 3 ? 'active' : '' ?>"></div>
    </div>

    <?php if ($error): ?><div class="error"><?= htmlspecialchars($error) ?></div><?php endif; ?>
    <?php if ($success): ?><div class="success"><?= htmlspecialchars($success) ?></div><?php endif; ?>

    <?php if ($step == 1): ?>
    <form method="POST">
        <input type="hidden" name="step" value="1">
        <label>License Key</label>
        <input type="text" name="license_key" placeholder="ZNV-XXXXXX-XXXXXX-XXXXXX" required>
        <label>School ID</label>
        <input type="text" name="school_id" placeholder="e.g., school-001" required>
        <label>License Server</label>
        <input type="text" name="license_server" value="https://superadmin.free.nf">
        <button type="submit">Next →</button>
    </form>
    <?php elseif ($step == 2): ?>
    <form method="POST">
        <input type="hidden" name="step" value="2">
        <input type="hidden" name="license_key" value="<?= htmlspecialchars($_POST['license_key']) ?>">
        <input type="hidden" name="license_server" value="<?= htmlspecialchars($_POST['license_server']) ?>">
        <input type="hidden" name="school_id" value="<?= htmlspecialchars($_POST['school_id']) ?>">
        <label>Database Password</label>
        <input type="password" name="db_password" placeholder="Min 8 characters" required minlength="8">
        <label>Secret Key</label>
        <input type="text" name="secret_key" placeholder="Min 32 random characters" required minlength="32" value="<?= bin2hex(random_bytes(32)) ?>">
        <button type="submit">Configure →</button>
    </form>
    <?php elseif ($step == 3): ?>
    <p style="color: #374151; font-size: 14px; margin-bottom: 16px;">
        Your <code>.env</code> file has been created. Start the system:
    </p>
    <pre style="background: #1f2937; color: #e5e7eb; padding: 16px; border-radius: 8px; font-size: 13px; margin-bottom: 20px;">docker compose up -d</pre>
    <p style="font-size: 13px; color: #6b7280;">
        The system will be available at <strong>http://localhost:80</strong>.
        <br>Initial setup takes about 2–3 minutes.
    </p>
    <?php endif; ?>
</div>
</body>
</html>
