export default function Stepper({ steps, current }) {
  return (
    <div className="flex items-center w-full mb-8">
      {steps.map((step, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`
                w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300
                ${done ? 'bg-[#F26522] text-white' : active ? 'bg-[#1B2A5C] text-white ring-4 ring-blue-100' : 'bg-gray-200 text-gray-500'}
              `}>
                {done ? '✓' : i + 1}
              </div>
              <span className={`text-xs mt-1 font-medium whitespace-nowrap ${active ? 'text-[#1B2A5C]' : done ? 'text-[#F26522]' : 'text-gray-400'}`}>
                {step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-4 transition-all duration-300 ${done ? 'bg-[#F26522]' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
