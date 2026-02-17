import { useState, useEffect } from 'react'
import { ParsedItem } from '../services/receiptParser'
import { X, Check, Plus, Trash2, ShoppingBag, Loader2 } from 'lucide-react'

interface Props {
    isOpen: boolean
    isParsing: boolean
    parsedItems: ParsedItem[]
    onConfirm: (items: string[]) => void
    onCancel: () => void
}

export default function ReceiptConfirmation({ isOpen, isParsing, parsedItems, onConfirm, onCancel }: Props) {
    const [items, setItems] = useState<ParsedItem[]>([])

    useEffect(() => {
        setItems(parsedItems)
    }, [parsedItems])

    if (!isOpen) return null

    const handleSave = () => {
        // Convert back to simple string array for the rest of the app
        const final = items.map(i => {
            const qty = i.quantity && i.quantity !== '1' ? `${i.quantity} ` : ''
            return `${qty}${i.name}`.trim()
        })
        onConfirm(final)
    }

    const handleDelete = (id: string) => {
        setItems(prev => prev.filter(i => i.id !== id))
    }

    const handleAdd = () => {
        setItems(prev => [
            {
                id: `new-${Date.now()}`,
                original: '',
                name: 'New Item',
                quantity: '1',
                category: 'Other',
                confidence: 100
            },
            ...prev
        ])
    }

    const updateItem = (id: string, field: keyof ParsedItem, value: string) => {
        setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <ShoppingBag className="w-5 h-5 text-purple-600" />
                            Verify Ingredients
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {isParsing
                                ? "AI is analyzing your receipt..."
                                : "Double check the list before we generate your meal plan."}
                        </p>
                    </div>
                    {!isParsing && (
                        <button
                            onClick={onCancel}
                            className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 overscroll-contain" style={{ willChange: 'scroll-position' }}>
                    {isParsing ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-4" />
                            <p className="text-gray-600 font-medium">Extracting ingredients...</p>
                            <p className="text-sm text-gray-400">This typically takes 5-10 seconds</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {items.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">
                                    <p>No items found. Try adding some manually!</p>
                                </div>
                            ) : (
                                items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3 transition-shadow duration-75 hover:shadow-md"
                                    >
                                        {/* Quantity Input */}
                                        <input
                                            value={item.quantity}
                                            onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                                            className="w-20 p-2 bg-gray-50 rounded-lg text-sm font-medium text-center focus:ring-2 focus:ring-purple-200 outline-none"
                                            placeholder="Qty"
                                        />

                                        {/* Name Input */}
                                        <input
                                            value={item.name}
                                            onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                                            className="flex-1 p-2 bg-transparent font-medium text-gray-900 focus:bg-gray-50 rounded-lg outline-none"
                                            placeholder="Item name"
                                        />

                                        {/* Category Badge (Read only visual for now) */}
                                        <span className={`
											hidden md:inline-block px-3 py-1 rounded-full text-xs font-bold
											${item.category === 'Produce' ? 'bg-green-100 text-green-700' :
                                                item.category === 'Meat' ? 'bg-red-100 text-red-700' :
                                                    item.category === 'Dairy' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-gray-100 text-gray-600'}
										`}>
                                            {item.category}
                                        </span>

                                        {/* Actions */}
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors duration-75"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}

                            <button
                                onClick={handleAdd}
                                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-medium hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add Missing Item
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {!isParsing && (
                    <div className="p-6 border-t border-gray-100 bg-white flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                            {items.length} items confirmed
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={onCancel}
                                className="px-6 py-2.5 rounded-lg font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-8 py-2.5 rounded-lg font-bold text-white bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2"
                            >
                                <Check className="w-4 h-4" />
                                Confirm List
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
