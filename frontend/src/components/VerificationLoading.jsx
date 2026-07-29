export default function VerificationLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <div className="text-center">
          <div className="h-20 w-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto animate-pulse">
            <Mail className="h-10 w-10 text-blue-400" />
          </div>
          <div className="h-8 w-48 bg-slate-200 rounded mx-auto mt-4 animate-pulse"></div>
          <div className="h-4 w-64 bg-slate-200 rounded mx-auto mt-2 animate-pulse"></div>
          <div className="mt-6 h-2 w-full bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-400 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}s