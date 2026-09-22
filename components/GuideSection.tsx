// components/GuideSection.tsx
// Section "Comment ça marche" avec des mini-maquettes (illustrations SVG)
// des écrans de l'app, expliquant l'utilisation pas à pas.

type Step = {
  n: number;
  title: string;
  description: string;
  illustration: React.ReactNode;
};

// Cadre "fenêtre" commun aux maquettes
const Frame = ({ children }: { children: React.ReactNode }) => (
  <svg viewBox="0 0 320 200" className="w-full h-auto" role="img">
    <defs>
      <linearGradient id="gBrand" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#2563eb" />
        <stop offset="100%" stopColor="#4f46e5" />
      </linearGradient>
    </defs>
    <rect x="0.5" y="0.5" width="319" height="199" rx="14" fill="#ffffff" stroke="#e2e8f0" />
    <rect x="0.5" y="0.5" width="319" height="30" rx="14" fill="#f8fafc" />
    <rect x="0.5" y="20" width="319" height="11" fill="#f8fafc" />
    <circle cx="18" cy="15" r="3.5" fill="#f87171" />
    <circle cx="30" cy="15" r="3.5" fill="#fbbf24" />
    <circle cx="42" cy="15" r="3.5" fill="#34d399" />
    <line x1="0.5" y1="31" x2="319.5" y2="31" stroke="#e2e8f0" />
    {children}
  </svg>
);

const LoginArt = (
  <Frame>
    <rect x="96" y="52" width="128" height="96" rx="10" fill="#ffffff" stroke="#e2e8f0" />
    <circle cx="160" cy="74" r="12" fill="url(#gBrand)" />
    <rect x="154" y="70" width="12" height="9" rx="2" fill="#ffffff" />
    <rect x="112" y="96" width="96" height="12" rx="3" fill="#eef2ff" stroke="#c7d2fe" />
    <rect x="116" y="100" width="44" height="4" rx="2" fill="#94a3b8" />
    <rect x="112" y="116" width="96" height="14" rx="4" fill="url(#gBrand)" />
    <rect x="132" y="121" width="56" height="4" rx="2" fill="#ffffff" opacity="0.9" />
  </Frame>
);

const ReportArt = (
  <Frame>
    <rect x="18" y="44" width="120" height="6" rx="3" fill="#1e293b" />
    <rect x="18" y="62" width="284" height="16" rx="4" fill="#f8fafc" stroke="#e2e8f0" />
    <rect x="24" y="68" width="40" height="4" rx="2" fill="#94a3b8" />
    <rect x="18" y="86" width="284" height="16" rx="4" fill="#f8fafc" stroke="#e2e8f0" />
    <rect x="24" y="92" width="120" height="4" rx="2" fill="#94a3b8" />
    <rect x="18" y="110" width="284" height="40" rx="4" fill="#f8fafc" stroke="#e2e8f0" />
    <rect x="24" y="118" width="240" height="3.5" rx="2" fill="#cbd5e1" />
    <rect x="24" y="127" width="220" height="3.5" rx="2" fill="#cbd5e1" />
    <rect x="24" y="136" width="180" height="3.5" rx="2" fill="#cbd5e1" />
    <rect x="18" y="160" width="70" height="14" rx="7" fill="#eff6ff" stroke="#bfdbfe" />
    <path d="M27 167 l3 -3 3 3" fill="none" stroke="#2563eb" strokeWidth="1.5" />
    <rect x="232" y="158" width="70" height="16" rx="5" fill="url(#gBrand)" />
    <rect x="248" y="164" width="38" height="4" rx="2" fill="#ffffff" opacity="0.9" />
  </Frame>
);

const NotesArt = (
  <Frame>
    <rect x="18" y="42" width="60" height="14" rx="7" fill="#eef2ff" stroke="#c7d2fe" />
    <rect x="26" y="47" width="40" height="4" rx="2" fill="#6366f1" />
    <text x="302" y="52" textAnchor="end" fontSize="15" fontWeight="700" fill="#16a34a" fontFamily="Helvetica, Arial, sans-serif">14.2</text>
    {[70, 96, 122].map((yy, i) => (
      <g key={i}>
        <rect x="18" y={yy} width="200" height="18" rx="4" fill="#f8fafc" stroke="#e2e8f0" />
        <rect x="26" y={yy + 6} width={70 - i * 12} height="5" rx="2.5" fill="#94a3b8" />
        <rect x="196" y={yy + 5} width="14" height="8" rx="2" fill="#dbeafe" />
      </g>
    ))}
    {/* sparkline */}
    <rect x="226" y="70" width="76" height="70" rx="6" fill="#f8fafc" stroke="#e2e8f0" />
    <polyline points="234,124 252,112 270,118 288,92" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="288" cy="92" r="2.5" fill="#2563eb" />
    <line x1="232" y1="105" x2="296" y2="105" stroke="#e2e8f0" strokeDasharray="2 2" />
  </Frame>
);

const ExportArt = (
  <Frame>
    {/* carte sélectionnée */}
    <rect x="18" y="44" width="284" height="30" rx="6" fill="#eff6ff" stroke="#3b82f6" strokeWidth="1.5" />
    <circle cx="288" cy="59" r="7" fill="#2563eb" />
    <path d="M285 59 l2 2 4 -4" fill="none" stroke="#ffffff" strokeWidth="1.6" />
    <rect x="30" y="54" width="120" height="5" rx="2.5" fill="#1e293b" />
    <rect x="30" y="63" width="70" height="4" rx="2" fill="#94a3b8" />
    {[82, 116].map((yy) => (
      <g key={yy}>
        <rect x="18" y={yy} width="284" height="30" rx="6" fill="#ffffff" stroke="#e2e8f0" />
        <circle cx="288" cy={yy + 15} r="7" fill="none" stroke="#cbd5e1" strokeWidth="1.5" />
        <rect x="30" y={yy + 10} width="110" height="5" rx="2.5" fill="#334155" />
        <rect x="30" y={yy + 19} width="60" height="4" rx="2" fill="#94a3b8" />
      </g>
    ))}
    {/* barre flottante Exporter */}
    <rect x="96" y="160" width="128" height="24" rx="12" fill="#ffffff" stroke="#e2e8f0" />
    <rect x="104" y="168" width="64" height="8" rx="4" fill="url(#gBrand)" />
    <path d="M180 168 v6 m0 0 l-2.5 -2.5 m2.5 2.5 l2.5 -2.5 M176 176 h8" fill="none" stroke="#2563eb" strokeWidth="1.4" strokeLinecap="round" />
  </Frame>
);

const steps: Step[] = [
  {
    n: 1,
    title: 'Connectez-vous en un clic',
    description: "Entrez votre email : vous recevez un lien magique, sans mot de passe à retenir. Cliquez dessus et vous voilà dans votre espace.",
    illustration: LoginArt,
  },
  {
    n: 2,
    title: "Rédigez vos rapports d'activité",
    description: "Créez un rapport (date, titre, description) et ajoutez vos pièces jointes (images, PDF, documents). Tout est enregistré et modifiable à tout moment.",
    illustration: ReportArt,
  },
  {
    n: 3,
    title: 'Suivez vos notes et moyennes',
    description: "Organisez vos UE par semestre, saisissez vos notes (avec coefficient), et laissez l'app calculer vos moyennes de semestre et annuelle, avec un graphe d'évolution.",
    illustration: NotesArt,
  },
  {
    n: 4,
    title: 'Exportez en PDF, à la carte',
    description: "Exportez tout, ou activez « Choisir les rapports à exporter » pour ne sélectionner que ceux qui vous intéressent. Un PDF propre et prêt à partager.",
    illustration: ExportArt,
  },
];

export default function GuideSection() {
  return (
    <section className="max-w-4xl mx-auto mt-16">
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1 ring-1 ring-indigo-100">
          Guide
        </span>
        <h3 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">Comment ça marche&nbsp;?</h3>
        <p className="mt-2 text-slate-600">Quatre étapes pour prendre l&apos;app en main.</p>
      </div>

      <div className="space-y-8">
        {steps.map((step, i) => (
          <div
            key={step.n}
            className={`card card-hover p-5 sm:p-6 flex flex-col md:flex-row items-center gap-6 animate-in ${i % 2 === 1 ? 'md:flex-row-reverse' : ''}`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="w-full md:w-1/2">
              <div className="rounded-xl overflow-hidden ring-1 ring-slate-100 shadow-sm">
                {step.illustration}
              </div>
            </div>
            <div className="w-full md:w-1/2">
              <div className="flex items-center gap-3 mb-2">
                <span className="h-8 w-8 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-md shadow-blue-500/30">
                  {step.n}
                </span>
                <h4 className="text-lg font-semibold text-slate-900">{step.title}</h4>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
