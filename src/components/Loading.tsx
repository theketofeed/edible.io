import { memo } from 'react'
import { ScanAnimation } from './ScanAnimation'

const Loading = memo(function Loading() {
	return (
		<div className="flex flex-col items-center justify-center py-12 px-4 animate-fadeIn">
			<div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-xl border border-purple-50 max-w-sm w-full text-center relative overflow-hidden">
				<div className="w-32 h-32 mx-auto mb-6 flex items-center justify-center -mt-6">
					<ScanAnimation />
				</div>

				<h3 className="heading text-xl font-black text-gray-900 mb-2">Generating your meal plan</h3>
				<p className="text-gray-500 font-medium italic">Edible is analyzing your receipt and balancing your nutrition...</p>
			</div>
		</div>
	)
})

export default Loading


