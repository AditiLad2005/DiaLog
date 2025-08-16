import React from 'react';

export default function SafeMealSuggestions({ prediction, loading }) {
    if (loading) {
        return (
            <div className="animate-pulse p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
        );
    }

    if (!prediction) return null;

    return (
        <div className="mt-8">
            <div className={`p-4 rounded-lg mb-6 ${
                prediction.is_safe ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
            } border`}>
                <h3 className="text-xl font-bold mb-2">
                    {prediction.is_safe ? '✅ Safe to Consume' : '⚠️ Caution Advised'}
                </h3>
                <p className="text-gray-600">
                    Confidence: {(prediction.confidence * 100).toFixed(1)}%
                </p>
            </div>

            {prediction.recommendations?.length > 0 && (
                <div className="mb-6">
                    <h4 className="font-bold mb-2">Recommendations:</h4>
                    <ul className="list-disc pl-5 space-y-1">
                        {prediction.recommendations.map((rec, idx) => (
                            <li key={idx} className="text-gray-700">{rec}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Nutritional Values */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
                <h4 className="font-bold mb-2">Nutritional Values:</h4>
                <div className="grid grid-cols-2 gap-4">
                    {Object.entries(prediction.nutritional_values).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                            <span className="text-gray-600">{key.replace(/_/g, ' ')}:</span>
                            <span className="font-medium">{value.toFixed(1)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
