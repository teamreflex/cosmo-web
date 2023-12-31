"use client";

export default function CurrentMonth() {
  const today = new Date().toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return <h1 className="text-lg">{today}</h1>;
}
