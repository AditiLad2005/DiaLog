import React, { useState } from 'react';
import { 
  PaperAirplaneIcon,
  StarIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

const Feedback = () => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // In a real app, this would send to a backend
    console.log({ rating, feedback, email });
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-soft p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <PaperAirplaneIcon className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
          <p className="text-gray-600 mb-6">
            Your feedback has been submitted successfully. We appreciate your input in helping us improve DiaLog.
          </p>
          <button
            onClick={() => setIsSubmitted(false)}
            className="w-full bg-primary-600 text-white py-3 rounded-xl hover:bg-primary-700 transition-colors duration-200"
          >
            Submit Another Feedback
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ChatBubbleLeftRightIcon className="h-8 w-8 text-primary-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            We Value Your Feedback
          </h1>
          <p className="text-lg text-gray-600">
            Help us improve DiaLog by sharing your experience and suggestions
          </p>
        </div>

        {/* Feedback Form */}
        <div className="bg-white rounded-2xl shadow-soft p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                How would you rate your overall experience?
              </label>
              <div className="flex space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 transition-colors duration-200"
                  >
                    {star <= rating ? (
                      <StarIconSolid className="h-8 w-8 text-yellow-400" />
                    ) : (
                      <StarIcon className="h-8 w-8 text-gray-300 hover:text-yellow-400" />
                    )}
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  {rating === 1 && "Poor - We'd love to know how we can improve"}
                  {rating === 2 && "Fair - Please let us know what went wrong"}
                  {rating === 3 && "Good - We appreciate your feedback"}
                  {rating === 4 && "Very Good - Thank you for the positive feedback!"}
                  {rating === 5 && "Excellent - We're thrilled you love DiaLog!"}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address (Optional)
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                placeholder="your.email@example.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                We'll only use this to follow up on your feedback if needed
              </p>
            </div>

            {/* Feedback Text */}
            <div>
              <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-2">
                Your Feedback
              </label>
              <textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={6}
                className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                placeholder="Tell us about your experience, what you liked, what could be improved, or any suggestions you have..."
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!feedback.trim() || rating === 0}
              className={`
                w-full flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-xl 
                transition-all duration-200 transform
                ${feedback.trim() && rating > 0
                  ? 'bg-primary-600 text-white hover:bg-primary-700 hover:-translate-y-1 shadow-medium hover:shadow-strong'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              <PaperAirplaneIcon className="h-6 w-6 mr-3" />
              Submit Feedback
            </button>
          </form>
        </div>

        {/* Additional Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Your feedback helps us make DiaLog better for everyone managing diabetes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Feedback;
