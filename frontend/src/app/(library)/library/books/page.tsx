"use client"

import { useState } from "react"
import { GenericListPage } from "@/components/ui/generic-list-page"
import { useBooks, useLibraryCategories } from "@/hooks/queries"

export default function LibraryBooksPage() {
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const { data: books, isLoading: loading } = useBooks({ limit: 100 })
  const { data: categories } = useLibraryCategories()

  const filtered = (books ?? []).filter((b: any) => {
    const matchSearch = !search || b.title?.toLowerCase().includes(search.toLowerCase()) || b.author?.toLowerCase().includes(search.toLowerCase()) || b.isbn?.includes(search)
    const matchCategory = !categoryFilter || b.category === categoryFilter || b.category_id === categoryFilter
    return matchSearch && matchCategory
  }) as any[]

  return (
    <GenericListPage
      title="Books"
      description="Manage library catalog"
      columns={[
        { key: "title", header: "Title", render: (b) => <span className="font-medium">{b.title}</span> },
        { key: "author", header: "Author", render: (b) => <span>{b.author || "\u2014"}</span> },
        { key: "isbn", header: "ISBN", render: (b) => <span className="font-mono text-xs">{b.isbn || "\u2014"}</span> },
        { key: "category", header: "Category", render: (b: any) => <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{b.category || b.category_name || "\u2014"}</span> },
        { key: "copies", header: "Copies", render: (b: any) => <span>{b.total_copies ?? b.copies ?? "\u2014"}</span> },
        { key: "available", header: "Available", render: (b: any) => {
          const avail = b.available_copies ?? b.available ?? 0
          return <span className={`font-medium ${avail > 0 ? "text-green-600" : "text-red-600"}`}>{avail}</span>
        }},
      ]}
      data={filtered}
      keyExtractor={(b) => b.id}
      loading={loading}
      searchPlaceholder="Search by title, author or ISBN..."
      onSearch={setSearch}
      emptyTitle="No books found"
      extraFilters={
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="">All Categories</option>
          {(categories ?? []).map((c: any) => <option key={c.id} value={c.name || c.id}>{c.name}</option>)}
        </select>
      }
    />
  )
}
