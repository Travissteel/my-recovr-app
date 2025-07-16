import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="mb-8">
            <span className="text-6xl mb-4 block">🌱</span>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              RecovR
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              Your comprehensive recovery companion supporting you through every step of your journey
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link to="/register">
              <Button size="lg" className="text-lg px-8 py-4">
                Start Your Journey 🚀
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg" className="text-lg px-8 py-4">
                Welcome Back
              </Button>
            </Link>
          </div>

          {/* Feature Preview */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <Card className="p-6 text-center">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold mb-2">Multi-Addiction Support</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Track recovery from 10+ addiction types with personalized programs
              </p>
            </Card>
            
            <Card className="p-6 text-center">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-xl font-semibold mb-2">Community Support</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Connect with others on similar journeys in safe, anonymous groups
              </p>
            </Card>
            
            <Card className="p-6 text-center">
              <div className="text-4xl mb-4">🆘</div>
              <h3 className="text-xl font-semibold mb-2">Crisis Intervention</h3>
              <p className="text-gray-600 dark:text-gray-400">
                24/7 emergency support and resources when you need them most
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-16 px-4 bg-white dark:bg-gray-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">
            Why Choose RecovR?
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4 text-green-600">✅ RecovR</h3>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>• Multi-addiction support (10+ types)</li>
                <li>• $100/year (2 months free)</li>
                <li>• Anonymous community features</li>
                <li>• Built-in crisis intervention</li>
                <li>• Professional integration</li>
                <li>• Comprehensive analytics</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-4 text-red-600">❌ Other Apps</h3>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>• Single-addiction focus</li>
                <li>• $19.99-$49.99/year</li>
                <li>• Limited community features</li>
                <li>• No crisis support</li>
                <li>• Basic tracking only</li>
                <li>• Expensive premium features</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-12 text-gray-900 dark:text-white">
            Affordable Recovery Support
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Free</h3>
              <div className="text-3xl font-bold mb-4">$0</div>
              <ul className="text-left space-y-2 mb-6">
                <li>• Basic recovery tracking</li>
                <li>• Limited community access</li>
                <li>• Standard content</li>
              </ul>
              <Link to="/register">
                <Button variant="outline" className="w-full">Get Started</Button>
              </Link>
            </Card>
            
            <Card className="p-6 border-2 border-blue-500 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-sm">
                Most Popular
              </div>
              <h3 className="text-xl font-semibold mb-4">Premium</h3>
              <div className="text-3xl font-bold mb-4">$100<span className="text-sm">/year</span></div>
              <ul className="text-left space-y-2 mb-6">
                <li>• All features included</li>
                <li>• Unlimited community access</li>
                <li>• AI-powered insights</li>
                <li>• Priority support</li>
                <li>• Crisis intervention</li>
              </ul>
              <Link to="/register">
                <Button className="w-full">Start Premium</Button>
              </Link>
            </Card>
            
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Lifetime</h3>
              <div className="text-3xl font-bold mb-4">$150<span className="text-sm"> once</span></div>
              <ul className="text-left space-y-2 mb-6">
                <li>• Everything in Premium</li>
                <li>• Lifetime access</li>
                <li>• Future updates included</li>
                <li>• Best value</li>
              </ul>
              <Link to="/register">
                <Button variant="outline" className="w-full">Get Lifetime</Button>
              </Link>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <span className="text-2xl">🌱</span>
            <span className="text-xl font-bold">RecovR</span>
          </div>
          <p className="text-gray-400">
            Supporting your recovery journey, one day at a time.
          </p>
        </div>
      </footer>
    </div>
  );
};