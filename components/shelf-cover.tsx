"use client";

import { useEffect, useState } from "react";

import type { ShelfBook } from "@/lib/shelf";

/** The first page of a saved book, used as its cover on the shelf. */
export function ShelfCover({ book }: { book: ShelfBook }) {
  const [url, setUrl] = useState<string | null>(null);
  const first = book.pages[0]?.image;

  useEffect(() => {
    if (!first) return;
    const u = URL.createObjectURL(first);
    setUrl(u);
    return () => {
      URL.revokeObjectURL(u);
      setUrl(null);
    };
  }, [first]);

  return url ? <img src={url} alt="" draggable={false} /> : <span className="sb-shelf-blank" />;
}
