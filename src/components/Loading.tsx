import { memo } from 'react'

const Loading = memo(function Loading() {
	return (
		<div className="flex flex-col items-center justify-center py-12 px-4 animate-fadeIn">
			<div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-xl border border-purple-50 max-w-sm w-full text-center relative overflow-hidden">
				<div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
					<div className="spinner-lavender !w-10 !h-10 !border-4" />
				</div>

				<h3 className="heading text-xl font-black text-gray-900 mb-2">Generating your meal plan</h3>
				<p className="text-gray-500 font-medium italic">Edible is analyzing recipes and balancing your nutrition...</p>
			</div>
		</div>
	)
})

export default Loading


