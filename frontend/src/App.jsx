import MealCard from './components/MealCard';

// Main React App entry point
function App() {
    return (
        <div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-indigo-100 via-white to-blue-100 px-4 py-8">
            {/* Header */}
            <div className="w-full max-w-5xl mx-auto mb-6">
                <div className="flex justify-center items-center">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-blue-700 to-cyan-600 font-serif drop-shadow-sm">
                        DiaLog · Smart Diabetes Meal Analyzer
                    </h1>
                </div>
            </div>

            {/* Main Content */}
            <div className="w-full max-w-5xl mx-auto flex-1">
                <MealCard />
            </div>
        </div>
    );
}

export default App;
