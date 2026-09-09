import { CombinedSearch } from "@/components/combined-search";

export default function SearchPage() {
  return (
    <section className="page-container page-container-wide">
      <div className="mb-8">
        <p className="eyebrow">Find</p>
        <h1 className="page-title">Search</h1>
        <p className="page-description">
          Search Gmail and your Signal conversation history together.
        </p>
      </div>
      <CombinedSearch />
    </section>
  );
}
