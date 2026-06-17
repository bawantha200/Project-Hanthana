export default function StatusBadge({ status }) {
  const isActive = status === 'active';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
      isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
    }`}>
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}
