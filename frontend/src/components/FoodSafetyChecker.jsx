import React, { useEffect, useState } from 'react';
import { MagnifyingGlassIcon, ShieldCheckIcon, XCircleIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { fetchFoods, getFoodDetails, predictDiabetesFriendly } from '../services/api';

// Simple badge helper
const Badge = ({ color, children }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>{children}</span>
);

export default function FoodSafetyChecker({ userProfile = {}, className = '' }) {
  const [foods, setFoods] = useState([]);
  const [isLoadingFoods, setIsLoadingFoods] = useState(false);
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState('');
  const [details, setDetails] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setIsLoadingFoods(true);
      try {
        const data = await fetchFoods();
        setFoods(data.foods || []);
      } catch (e) {
        console.error(e);
        setFoods([]);
      } finally {
        setIsLoadingFoods(false);
      }
    };
    load();
  }, []);

  const filtered = query
    ? foods.filter((f) => f.toLowerCase().includes(query.toLowerCase())).slice(0, 20)
    : foods.slice(0, 20);

  const pick = async (name) => {
    setSelected(name);
    setQuery(name);
    setError('');
    setDetails(null);
    setResult(null);
    setShowDropdown(false);
    try {
      const d = await getFoodDetails(name);
      setDetails(d);
    } catch (e) {
      const msg = typeof e?.message === 'string' ? e.message : 'Failed to fetch details';
      setError(msg);
    }
  };

  const checkSafety = async () => {
    if (!selected) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const body = {
        age: userProfile.age ?? 35,
        gender: userProfile.gender ?? 'Male',
        weight_kg: userProfile.weight_kg ?? 70,
        height_cm: userProfile.height_cm ?? 170,
        fasting_sugar: userProfile.fasting_sugar ?? 100,
        post_meal_sugar: userProfile.post_meal_sugar ?? 140,
        meal_taken: selected,
        time_of_day: 'Lunch',
        portion_size: 200, // grams
        portion_unit: 'g'
      };
      const resp = await predictDiabetesFriendly(body);
      setResult(resp);
    } catch (e) {
      const detail = e?.message || e?.toString?.() || 'Prediction failed';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  const riskLevel = result?.risk_level; // 'low' | 'medium' | 'high'
  const statusBadge = (() => {
    const badge = result?.risk_badge;
    if (badge?.color === 'green') return <Badge color="bg-green-100 text-green-700">{badge.label || 'SAFE'}</Badge>;
    if (badge?.color === 'yellow') return <Badge color="bg-yellow-100 text-yellow-700">{badge.label || 'CAUTION'}</Badge>;
    if (badge?.color === 'red') return <Badge color="bg-red-100 text-red-700">{badge.label || 'UNSAFE'}</Badge>;
    if (riskLevel === 'low') return <Badge color="bg-green-100 text-green-700">SAFE</Badge>;
    if (riskLevel === 'medium' || riskLevel === 'moderate') return <Badge color="bg-yellow-100 text-yellow-700">CAUTION</Badge>;
    if (riskLevel === 'high') return <Badge color="bg-red-100 text-red-700">UNSAFE</Badge>;
    return <Badge color="bg-gray-100 text-gray-700">Unknown</Badge>;
  })();

  return (
    <div className={`bg-white/80 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl border border-neutral-100 dark:border-neutral-700 shadow-soft p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <ShieldCheckIcon className="h-6 w-6 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Food Safety Check</h2>
        </div>
      </div>

      {/* Search (aligned with Meal Log dropdown UX) */}
      <div className="relative mb-4">
        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          className="block w-full pl-10 pr-3 py-2 border border-neutral-200 dark:border-neutral-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-inner"
          placeholder={isLoadingFoods ? 'Loading meals...' : 'Type to search food'}
          autoComplete="off"
        />
        {showDropdown && query && foods.length > 0 && (
          <ul className="absolute z-10 w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-neutral-200 dark:border-neutral-700 rounded-xl mt-1 max-h-56 overflow-y-auto shadow-lg">
            {foods
              .filter((opt) => opt.toLowerCase().includes(query.toLowerCase()))
              .slice(0, 8)
              .map((opt) => (
                <li
                  key={opt}
                  className="px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100"
                  onMouseDown={() => pick(opt)}
                >
                  {opt}
                </li>
              ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Details */}
        <div className="flex-1 p-4 border border-neutral-200 dark:border-neutral-700 rounded-xl bg-gray-50 dark:bg-gray-800">
          <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Nutritional Info</h3>
          {details ? (
            <ul className="text-sm text-gray-700 dark:text-gray-300 grid grid-cols-2 gap-y-1">
              <li>Calories: {details.calories ?? details?.nutritional_info?.calories_kcal ?? '—'}</li>
              <li>Carbs: {details.carbs ?? details?.nutritional_info?.carbs_g ?? '—'} g</li>
              <li>Protein: {details.protein ?? details?.nutritional_info?.protein_g ?? '—'} g</li>
              <li>Fat: {details.fat ?? details?.nutritional_info?.fat_g ?? '—'} g</li>
              <li>Fiber: {details.fiber ?? details?.nutritional_info?.fiber_g ?? '—'} g</li>
              <li>GI: {details.glycemicIndex ?? details?.nutritional_info?.glycemic_index ?? '—'}</li>
              <li>GL: {details.glycemic_load ?? details?.nutritional_info?.glycemic_load ?? '—'}</li>
            </ul>
          ) : (
            <div className="flex items-center text-gray-500 text-sm">
              <QuestionMarkCircleIcon className="h-4 w-4 mr-2" /> Select a food to see details
            </div>
          )}
        </div>

        {/* Result */}
        <div className="w-full md:w-80 p-4 border border-neutral-200 dark:border-neutral-700 rounded-xl bg-white dark:bg-gray-800">
          <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Safety Result</h3>
          {error && (
            <div className="text-sm text-red-600 flex items-center mb-2">
              <XCircleIcon className="h-4 w-4 mr-1" /> {error}
            </div>
          )}
          {result ? (
            <div>
              <div className="mb-2">{statusBadge}</div>
              {result?.gl_badge && (
                <div className="mb-2">
                  <Badge
                    color={
                      result.gl_badge.color === 'green'
                        ? 'bg-green-100 text-green-700'
                        : result.gl_badge.color === 'yellow'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }
                  >
                    {result.gl_badge.label}
                  </Badge>
                </div>
              )}
              {typeof result?.is_safe === 'boolean' && (
                <div className="text-sm text-gray-700 dark:text-gray-300">Overall: {result.is_safe ? 'Safe' : 'Not Safe'}</div>
              )}
              {result?.confidence != null && (
                <div className="text-sm text-gray-700 dark:text-gray-300">Confidence: {(result.confidence * 100).toFixed(0)}%</div>
              )}
              {result?.personalized_predicted_blood_sugar != null && (
                <div className="text-sm text-gray-700 dark:text-gray-300">Personalized prediction: {Math.round(result.personalized_predicted_blood_sugar)} mg/dL</div>
              )}
              {result?.message && (
                <p className="text-xs mt-2 text-gray-600 dark:text-gray-400">{result.message}</p>
              )}
            </div>
          ) : (
            <button
              onClick={checkSafety}
              disabled={!selected || loading}
              className="w-full px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-60"
            >
              {loading ? 'Checking…' : 'Check Safety'}
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-3">Note: This quick checker does not log the meal. Use Meal Log to record what you ate.</p>
    </div>
  );
}
