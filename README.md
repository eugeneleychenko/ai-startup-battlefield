# AI Battle Arena 🤖⚔️

A real-time AI model competition platform where multiple AI models generate startup pitches simultaneously, with an AI judge determining the winner.

## 🚀 Features

- **Multi-Model Competition**: Groq (Llama 3.3), OpenAI (GPT-4o), and Anthropic (Claude Sonnet 4) generate pitches in parallel
- **AI Judge**: Anthropic Claude Opus 4.1 evaluates and scores all pitches
- **Real-time Streaming**: Watch pitches generate live with streaming responses
- **Modern UI**: Built with Next.js, Tailwind CSS, and shadcn/ui components
- **Error Handling**: Robust fallback strategies and retry mechanisms
- **Responsive Design**: Works seamlessly on desktop and mobile

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with App Router
- **AI Integration**: Vercel AI SDK
- **Models**: 
  - Groq (Llama 3.3 70B Versatile)
  - OpenAI (GPT-4o)
  - Anthropic (Claude Sonnet 4 & Opus 4.1)
- **Styling**: Tailwind CSS + shadcn/ui
- **Language**: TypeScript

## 🏃‍♂️ Quick Start

### Prerequisites

- Node.js 18+
- npm/pnpm/yarn
- API keys for Groq, OpenAI, and Anthropic

### Installation

1. Clone the repository:
```bash
git clone https://github.com/eugeneleychenko/ai-startup-battlefield.git
cd ai-startup-battlefield
```

2. Install dependencies:
```bash
npm install
# or
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Add your API keys to `.env.local`:
```env
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GROQ_API_KEY=your_groq_key
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🎮 How to Use

1. **Enter Your Concept**: Type in your startup idea (e.g., "Uber for dogs")
2. **Choose Target Group**: Select your target audience (e.g., "busy pet owners")
3. **Spin the Wheel**: Click the central button to start the battle
4. **Watch the Magic**: See three AI models generate unique pitches simultaneously
5. **Judge's Verdict**: Claude Opus 4.1 evaluates all pitches and declares a winner

## 📁 Project Structure

```
ai-battle-arena/
├── app/
│   ├── api/
│   │   ├── pitch/           # Model-specific pitch generation
│   │   │   ├── groq/
│   │   │   ├── openai/
│   │   │   └── anthropic/
│   │   └── judge/           # AI judge evaluation
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── battle-arena.tsx     # Main competition interface
│   ├── judge-verdict.tsx    # Results display
│   └── spinning-wheels.tsx  # Loading animations
├── lib/
│   ├── api-client.ts        # API utilities
│   ├── prompt-templates.ts  # AI prompts
│   └── types.ts             # TypeScript definitions
└── docs/
    ├── tasklist.md          # Implementation checklist
    └── tech_spec.md         # Technical specification
```

## 🧪 API Endpoints

- `POST /api/pitch/groq` - Generate pitch using Llama 3.3
- `POST /api/pitch/openai` - Generate pitch using GPT-4o  
- `POST /api/pitch/anthropic` - Generate pitch using Claude Sonnet 4
- `POST /api/judge` - Evaluate pitches using Claude Opus 4.1
- `GET /api/health` - Health check endpoint

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main

### Other Platforms

The app can be deployed on any platform supporting Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## 🔧 Development

### Testing API Routes

Use the included test script:
```bash
node scripts/test-api.js
```

### Error Handling

The application includes comprehensive error handling:
- Connection timeouts (30s per model)
- Retry mechanisms for failed requests
- Graceful degradation (continue with successful models)
- User-friendly error messages

### Performance

- Streaming responses for real-time feedback
- Parallel API calls for maximum speed
- Request debouncing to prevent spam
- Optimized bundle size with dynamic imports

## 📝 License

MIT License - feel free to use this project for learning and experimentation!

## 🤝 Contributing

Contributions welcome! Please read the technical specification in `tech_spec.md` for implementation details.

## 📞 Support

- Check `tasklist.md` for implementation status
- Review `ERROR_HANDLING_SUMMARY.md` for troubleshooting
- Open an issue for bugs or feature requests

---

Built with ❤️ and powered by the latest AI models
