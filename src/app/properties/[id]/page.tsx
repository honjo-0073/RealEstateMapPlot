import { PropertyEditForm } from '@/components/property-edit-form';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PropertyPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <main className="review-shell">
      <PropertyEditForm propertyId={id} />
    </main>
  );
}
