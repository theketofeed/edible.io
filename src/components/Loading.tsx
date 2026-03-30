import { memo } from 'react'
import { ScanAnimation } from './ScanAnimation'

const Loading = memo(function Loading() {
	return (
		<div className="flex flex-col items-center justify-center py-12 px-4 transition-all duration-500">
			<div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl border border-purple-50 max-w-md w-full text-center relative overflow-hidden">
				<div className="w-48 h-48 mx-auto mb-6 flex items-center justify-center relative -mt-4 md:-mt-8">
					<div className="absolute inset-0 bg-purple-100/20 rounded-full blur-3xl animate-pulse"></div>
					<ScanAnimation />
				</div>

				<div className="relative z-10">
					<h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">
						Generating your meal plan
					</h3>
					<p className="text-gray-500 font-medium italic leading-relaxed">
						Edible is analyzing your receipt and balancing your nutrition...
					</p>
				</div>
			</div>
		</div>
	)
})

export default Loading


