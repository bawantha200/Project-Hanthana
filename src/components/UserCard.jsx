import RoleBadge from './RoleBadge';
import StatusBadge from './StatusBadge';

export default function UserCard({ user }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-sm font-bold shadow-sm flex-shrink-0">
          {user.avatar || user.name?.split(' ').map(n => n[0]).join('')}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-gray-900 truncate">{user.name}</h4>
            <RoleBadge role={user.role} />
          </div>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{user.email}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            {/* <span>{user.branch}</span> */}
            <span className="text-gray-300">|</span>
            <StatusBadge status={user.status} />
          </div>
        </div>
      </div>
    </div>
  );
}
