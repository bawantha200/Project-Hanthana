import { getRoleColor } from '../utils/helpers';

export default function RoleBadge({ role }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(role)}`}>
      {role}
    </span>
  );
}
