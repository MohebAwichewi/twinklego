import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Check,
  ChevronRight,
  CircleCheck,
  Clock3,
  Headphones,
  HeartHandshake,
  MapPin,
  Navigation,
  PackageCheck,
  ClipboardCheck,
  Home as HomeIcon,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  UserRoundCheck,
} from "lucide-react";
import { WaitlistForm } from "./waitlist-form";
import Reveal from "@/components/reveal";

const tasks = [
  { icon: ShoppingBag, label: "Pick up groceries", color: "coral" },
  { icon: PackageCheck, label: "Send a package", color: "blue" },
  { icon: HeartHandshake, label: "Help around home", color: "teal" },
  { icon: Clock3, label: "A quick local errand", color: "gold" },
];

const steps = [
  { number: "01", title: "Request help", text: "Tell us what you need and where.", icon: Sparkles },
  { number: "02", title: "Get matched", text: "Connect with a nearby verified runner.", icon: UserRoundCheck },
  { number: "03", title: "Task completed", text: "Follow progress and stay in touch.", icon: CircleCheck },
  { number: "04", title: "Payment released", text: "Pay securely once everything is done.", icon: Banknote },
];

const safety = [
  { title: "Government ID", text: "Every runner submits a government-issued ID for review.", icon: BadgeCheck },
  { title: "Phone verification", text: "Phone details help keep accounts accountable.", icon: Phone },
  { title: "Address verification", text: "Address records support safer local task matching.", icon: HomeIcon },
  { title: "Community ratings", text: "Real reviews help you choose with confidence.", icon: Star },
  { title: "GPS activity", text: "Track active tasks and know where things stand.", icon: Navigation },
  { title: "Emergency contact", text: "Extra support is always built into the journey.", icon: Headphones },
  { title: "Admin review", text: "Disputes and verification requests go through human review.", icon: ClipboardCheck },
];

function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <a className={`logo ${inverse ? "logo-inverse" : ""}`} href="#" aria-label="TwinkleGo home">
      <span className="logo-mark" aria-hidden="true">
        <Sparkles size={19} strokeWidth={2.4} />
      </span>
      <span>Twinkle</span><strong>Go</strong>
    </a>
  );
}

export default function Home() {
  return (
    <main>
      <header className="nav-wrap">
        <nav className="nav container">
          <Logo />
          <div className="nav-links">
            <a href="#how-it-works">How it works</a>
            <a href="#safety">Trust & safety</a>
            <a href="#earn">Earn with us</a>
          </div>
          <div className="nav-actions">
            <a className="nav-auth-link" href="/login">Log in</a>
            <a className="button button-small" href="/signup">Sign up <ArrowRight size={16} /></a>
          </div>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />
        <div className="container hero-grid">
          <div className="hero-copy hero-enter">
            <div className="eyebrow"><span><Sparkles size={14} /></span> Help is closer than you think</div>
            <h1>Need something <em>done?</em></h1>
            <p className="hero-lead">Get trusted help nearby.</p>
            <p className="hero-body">Busy people need help. Other people need income. TwinkleGo connects them safely.</p>
            <div className="hero-actions">
              <a className="button" href="/signup">Get help now <ArrowRight size={18} /></a>
              <a className="text-link" href="#how-it-works">See how it works <ChevronRight size={17} /></a>
            </div>
            <div className="trust-row">
              <span className="trust-row-icon"><ShieldCheck size={20} /></span>
              <p><strong>Built for real life</strong><br />Safe, local, and made for your community.</p>
            </div>
          </div>

          <div className="hero-scene hero-enter hero-enter-delay" aria-label="TwinkleGo task matching preview">
            <iframe className="hero-map-image" title="OpenStreetMap of Victoria Island, Lagos" src="https://www.openstreetmap.org/export/embed.html?bbox=3.405%2C6.415%2C3.44%2C6.445&layer=mapnik&marker=6.4281%2C3.4219" loading="eager" />
            <div className="runner-card">
              <div className="runner-avatar"><BadgeCheck size={20} /></div>
              <div><strong>Real verified runners</strong><small>Shown from live availability and GPS</small></div>
              <span className="live-dot">Live data</span>
            </div>
            <div className="task-card">
              <span className="task-icon"><ShoppingBag size={22} /></span>
              <div><small>Post a real task</small><strong>Choose addresses from the map</strong><p><MapPin size={12} /> Distance and price calculate automatically</p></div>
              <span className="task-status"><Check size={14} /> Ready to request</span>
            </div>
          </div>
        </div>
      </section>

      <section className="task-strip container" aria-label="Ways TwinkleGo can help">
        {tasks.map(({ icon: Icon, label, color }) => (
          <div className="task-chip" key={label}><span className={color}><Icon size={20} /></span>{label}</div>
        ))}
      </section>

      <section className="earn-section" id="earn">
        <div className="container earn-grid">
          <Reveal className="earn-visual">
            <div className="phone">
              <div className="phone-top"><Logo /></div>
              <div className="phone-greeting"><span>Good morning, Tolu</span><strong>Ready to earn nearby?</strong></div>
              <div className="availability"><span><i /> Available mode</span><b /></div>
              <div className="mini-task"><span className="coral"><ShoppingBag size={19} /></span><div><strong>Market pickup</strong><small>1.2 km away · 35 min</small></div><b>₦3,500</b></div>
              <div className="mini-task"><span className="teal"><PackageCheck size={19} /></span><div><strong>Deliver a parcel</strong><small>On your way · 20 min</small></div><b>₦2,200</b></div>
            </div>
            <div className="earn-bubble"><Banknote size={20} /><span><small>Earned today</small><strong>₦8,400</strong></span></div>
          </Reveal>
          <Reveal className="section-copy" delay={100}>
            <div className="eyebrow"><span><Banknote size={14} /></span> Your time, your choice</div>
            <h2>Need extra income?</h2>
            <p className="section-lead">Become available and earn while going about your day.</p>
            <p>Switch on Available Mode whenever it suits you. See nearby requests, choose the ones that fit your route, and get paid for helping someone in your community.</p>
            <ul className="check-list">
              <li><Check size={17} /> Work when you want</li>
              <li><Check size={17} /> Choose tasks nearby</li>
              <li><Check size={17} /> Get paid securely</li>
            </ul>
            <a className="button button-dark" href="/signup">Become a runner <ArrowRight size={18} /></a>
          </Reveal>
        </div>
      </section>

      <section className="how section" id="how-it-works">
        <div className="container">
          <div className="section-heading">
            <div><div className="eyebrow"><span><Sparkles size={14} /></span> Simple from start to finish</div><h2>How it works</h2></div>
            <p>From “I need a hand” to “all done” in four clear, secure steps.</p>
          </div>
          <div className="steps-grid">
            {steps.map(({ number, title, text, icon: Icon }) => (
              <Reveal className="step-card" delay={Number(number) * 60} key={number}>
                <div className="step-top"><span>{number}</span><i><Icon size={22} /></i></div>
                <h3>{title}</h3><p>{text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="safety section" id="safety">
        <div className="container safety-grid">
          <Reveal className="section-copy safety-copy">
            <div className="eyebrow eyebrow-light"><span><ShieldCheck size={14} /></span> Trust comes first</div>
            <h2>Help should feel helpful. Not risky.</h2>
            <p className="section-lead">TwinkleGo is designed around trust and safety at every step.</p>
            <p>From the moment someone joins to the moment a task is completed, we create clear records, real accountability, and ways to get support.</p>
            <div className="safety-note"><ShieldCheck size={24} /><span><strong>Your safety is never an afterthought.</strong><small>Verification, tracking, and support are built in.</small></span></div>
          </Reveal>
          <div className="safety-cards">
            {safety.map(({ title, text, icon: Icon }, index) => (
              <Reveal delay={index * 55} key={title}><article><span><Icon size={21} /></span><h3>{title}</h3><p>{text}</p></article></Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="waitlist section" id="waitlist">
        <div className="container waitlist-card">
          <div className="waitlist-sparkle"><Sparkles size={30} /></div>
          <div className="waitlist-copy">
            <div className="eyebrow"><span><Sparkles size={14} /></span> Coming soon</div>
            <h2>A little help can change your whole day.</h2>
            <p>Join the TwinkleGo waitlist and be among the first to get trusted help nearby or earn by helping others.</p>
          </div>
          <WaitlistForm />
          <p className="privacy"><ShieldCheck size={14} /> No spam. Just important TwinkleGo updates.</p>
        </div>
      </section>

      <footer>
        <div className="container footer-grid">
          <div><Logo inverse /><p>Trusted help nearby. Flexible income for your community.</p></div>
          <div className="footer-links"><a href="#how-it-works">How it works</a><a href="#safety">Trust & safety</a><a href="#earn">Earn with us</a><a href="#waitlist">Join waitlist</a></div>
        </div>
        <div className="container footer-bottom"><span>© 2026 TwinkleGo. All rights reserved.</span><span>Made for everyday people.</span></div>
      </footer>
    </main>
  );
}
