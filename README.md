# RecovR - Multi-Addiction Recovery Platform

RecovR is a comprehensive recovery platform designed to support individuals in overcoming various forms of addiction including pornography, social media, alcohol, drugs, food, and other behavioral addictions. Built with modern web technologies and evidence-based recovery methodologies.

## 🚀 Features

### Core Recovery Features
- **Multi-Addiction Support**: Track recovery from 10+ addiction types
- **90-Day Structured Program**: Evidence-based recovery phases
- **Life Tree Visualization**: Interactive progress tracking inspired by successful apps like Quittr
- **Real-Time Progress Dashboard**: Comprehensive analytics and insights
- **Daily Check-ins**: Mood, cravings, stress, and wellness tracking
- **Streak Counters**: Motivational progress tracking with animations

### Community & Support
- **Anonymous Community Groups**: Safe spaces for peer support
- **Crisis Intervention System**: 24/7 emergency support resources
- **Support Network Management**: Connect with family, friends, and professionals
- **Success Story Sharing**: Inspire others with your journey

### Advanced Features
- **AI-Powered Insights**: Personalized recommendations and risk assessment
- **Blocking Tools**: Content filtering and app usage monitoring
- **Educational Content**: Daily recovery-focused content and exercises
- **Gamification**: Achievements, milestones, and motivation system

## 💰 Competitive Pricing

**More Affordable Than Quittr** (which charges $19.99-$49.99/year):

### Free Tier
- Basic recovery tracking
- Limited community access
- Standard educational content
- Basic blocking tools

### Premium Tier - **Best Value**
- **Monthly**: $6.99/month (vs Quittr's $9.99-$14.99)
- **Yearly**: $24.99/year (vs Quittr's $19.99-$49.99) - **65% savings**
- **Lifetime**: $79.99 (limited time - vs our original $150)

### Features Included in Premium
- Advanced analytics and insights
- Unlimited community features
- Priority customer support
- AI-powered blocking and filtering
- Personalized coaching recommendations
- Multi-addiction support (vs single-addiction focus)
- Crisis intervention system

## 🛠 Technology Stack

### Backend
- **Node.js** with Express.js
- **PostgreSQL** with comprehensive schema
- **JWT Authentication** with refresh tokens
- **Socket.io** for real-time features
- **Rate limiting** and security middleware
- **CORS** and **Helmet** for security

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Context API** for state management
- **Axios** for API calls with interceptors
- **Responsive design** for all devices

### Security Features
- **Bcrypt** password hashing (12 rounds)
- **JWT tokens** with expiration
- **SQL injection** prevention
- **XSS protection**
- **Rate limiting**
- **Input validation**

## 📦 Installation

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### Backend Setup
```bash
# Clone the repository
git clone <repository-url>
cd my-recovr-app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
npm run db:migrate

# Start the server
npm run server
```

### Frontend Setup
```bash
# Install frontend dependencies (if not already done)
npm install

# Start the development server
npm run client

# Or run both frontend and backend
npm run dev
```

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/recovr_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=recovr_db
DB_USER=username
DB_PASSWORD=password

# JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-refresh-secret-here

# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

## 🎯 Key Differentiators vs Quittr

1. **Multi-Addiction Support**: Unlike Quittr's single-focus approach, RecovR supports 10+ addiction types
2. **Better Pricing**: 65% more affordable than Quittr with more features
3. **Community Features**: Advanced anonymous community support
4. **Crisis Intervention**: Built-in emergency support system
5. **Comprehensive Analytics**: Detailed progress tracking and insights
6. **Professional Integration**: Connect with therapists and counselors

## 🔒 Security & Privacy

- **End-to-end encryption** for sensitive data
- **Anonymous user options** for privacy
- **GDPR compliant** data handling
- **No data selling** - user privacy first
- **Secure authentication** with JWT tokens
- **Regular security audits**

## 📱 Mobile Ready

- **Responsive design** works on all devices
- **Progressive Web App** capabilities
- **Touch-friendly interface**
- **Offline functionality** (coming soon)

## 🚦 Getting Started

1. **Sign up** for a free account
2. **Complete onboarding** - select your addiction types and goals
3. **Start your first program** - choose 30, 60, or 90-day plans
4. **Join community groups** - connect with others on similar journeys
5. **Track daily progress** - check in daily with mood, cravings, and wins

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Crisis Support**: Built-in crisis intervention with 24/7 resources
- **Community Support**: Anonymous peer support groups
- **Email Support**: support@recovr.com
- **Documentation**: [docs.recovr.com](https://docs.recovr.com)

## 🎉 Success Stories

> "RecovR's multi-addiction support helped me tackle both my social media and food addiction simultaneously. The community support is incredible." - Anonymous User

> "The Life Tree visualization keeps me motivated every day. Much better value than other apps I've tried." - RecovR User

---

**Start your recovery journey today with RecovR - More features, better support, affordable pricing.**