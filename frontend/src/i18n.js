import { createContext, useContext, useState } from 'react';

export const translations = {
  en: {
    nav: {
      manifesto: 'Manifesto',
      talent: 'Talent',
      companies: 'Companies',
      contact: 'Contact',
      cta: 'Join the network',
      live: 'LIVE MESH',
    },
    hero: {
      badge: 'SYS_V2.6 // CONNECT. BUILD. REMOTE.',
      lines: ['Your next', 'remote tech role', 'starts here.'],
      sub: 'Ashtor.net bridges the gap between skilled IT professionals and forward-thinking companies looking for remote talent.',
      ctaPrimary: 'Find your dream role',
      ctaSecondary: 'Hire top talent',
      metrics: [
        { label: 'Active Tech Roles', value: '1,420+', note: '+18% this week' },
        { label: 'Avg. Match Latency', value: '72h', note: 'Vetted Tier-1' },
        { label: 'Global Node Spread', value: '48 Countries', note: '100% Remote' },
        { label: 'Retention Rate', value: '96.4%', note: 'Top 3% Talent' },
      ],
    },
    marquee: [
      'Rust', 'Go', 'Kubernetes', 'Zero-Trust', 'Smart Contracts', 'DevSecOps',
      'Python AI', 'Distributed Systems', 'React', 'Penetration Testing',
      'Terraform', 'WebGL', 'SOC Operations', 'Distributed Databases',
    ],
    manifesto: {
      eyebrow: 'THE ASHTOR CREED',
      title: 'A manifesto for borderless engineering',
      chapters: [
        {
          num: '01',
          tag: 'THE DECENTRALIZED WORKFORCE',
          title: 'Border-Blind Engineering Prowess',
          body: 'Great code and unbreakable security architecture do not recognize city limits. We source the top 3% of software engineers and cybersecurity defenders globally.',
        },
        {
          num: '02',
          tag: 'RIGID VETTING ENGINE',
          title: 'Live System Design & Penetration Testing',
          body: 'No resume keyword bingo. Every talent passes blind algorithmic challenges, live system architecture reviews, and zero-day threat defense simulations.',
        },
        {
          num: '03',
          tag: 'HIGH-VELOCITY MATCHING',
          title: 'From Intake to First Commit in 72h',
          body: 'Traditional tech recruiting takes 45 days of wasted interviews. Ashtor delivers pre-evaluated candidates ready to execute within 3 business days.',
        },
      ],
    },
    specs: {
      eyebrow: 'SPECIALIZATION DOMAINS',
      title: 'Elite talent, mapped to your stack',
      sub: 'Three operational domains. One global network of verified engineers.',
      cards: [
        {
          badge: 'CRITICAL PROTOCOL',
          title: 'Cybersecurity & InfoSec Operations',
          roles: ['SOC Lead / Threat Hunter', 'AppSec & Penetration Tester', 'Cloud Security Architect (AWS/GCP)', 'DevSecOps Pipeline Engineer', 'Zero-Trust & Identity Specialist'],
          accent: 'emerald',
        },
        {
          badge: 'HIGH VELOCITY',
          title: 'Full-Stack & Distributed Systems',
          roles: ['Senior Backend (Go / Rust / Node / Python)', 'Frontend Architects (React, Next, WebGL)', 'Cloud Infrastructure & SRE (K8s / Terraform)', 'Distributed Database Engineers', 'AI / ML Platform Developers'],
          accent: 'cyan',
        },
        {
          badge: 'STRATEGIC TIER',
          title: 'Engineering Leadership & Scale',
          roles: ['Fractional & Full-time CTO', 'Staff / Principal Engineers', 'VP of Engineering', 'Tech Leads & Scrum Masters'],
          accent: 'amber',
        },
      ],
    },
    pathways: {
      eyebrow: 'DUAL PROTOCOL',
      title: 'Two paths. One network.',
      tabs: { talent: 'For Talent', company: 'For Companies' },
      talent: {
        title: 'For IT Professionals & Cyber Experts',
        steps: [
          { step: '01', title: 'Fast-Track Skill Benchmark', desc: 'Complete a 45-min hands-on tech challenge tailored to your specialization.' },
          { step: '02', title: 'Profile Curation & Salary Alignment', desc: 'Set your global USD benchmark, tax preferences, and timezone overlap.' },
          { step: '03', title: 'Direct Matches with Funded Tech Startups', desc: 'Skip recruitment spam. Receive direct match offers from verified CTOs.' },
        ],
      },
      company: {
        title: 'For Tech Companies & Founders',
        steps: [
          { step: '01', title: 'Specify Tech Stack & Seniority', desc: 'Share your exact architecture needs, compliance criteria, and budget.' },
          { step: '02', title: 'Review Top 3 Vetted Profiles', desc: 'Get video intros, validated code repositories, and security scores within 48h.' },
          { step: '03', title: 'Risk-Free 14-Day Trial & Onboarding', desc: 'Seamless compliance, automated cross-border payroll, and replacement guarantee.' },
        ],
      },
    },
    form: {
      eyebrow: 'INTAKE TERMINAL',
      title: 'Initialize your connection',
      sub: 'One signal is enough. Tell us who you are and the network routes you to the right matches.',
      roleLabel: 'I am a...',
      roles: ['Software Developer / IT', 'Cybersecurity Specialist', 'Company / Hiring Manager'],
      name: 'Full Name',
      namePh: 'e.g. Alex Vance',
      email: 'Work / Professional Email',
      emailPh: 'alex@ashtor.net',
      skills: 'Primary Tech Stack or Hiring Requirements',
      skillsPh: 'e.g. Senior Golang & Kubernetes with AWS SecOps experience...',
      location: 'Current Location / Country',
      locationPh: 'e.g. Spain, Argentina, Mexico, USA...',
      submit: 'Initialize Connection Protocol',
      sending: 'Transmitting...',
      success: 'Connection initialized. Our routing team will contact you within 24h.',
      error: 'Transmission failed. Check the fields and retry.',
      terminal: 'ashtor_intake — v2.6 — 80×24',
    },
    footer: {
      status: 'SYSTEM OPERATIONAL — NODES SECURE',
      links: ['Talent Portal', 'Client Hub', 'Security Charter', 'Terms', 'Privacy'],
      rights: '© 2026 ashtor.net — Connect. Build. Remote.',
      note: 'Engineered for the borderless workforce.',
    },
  },
  es: {
    nav: {
      manifesto: 'Manifiesto',
      talent: 'Talento',
      companies: 'Empresas',
      contact: 'Contacto',
      cta: 'Únete a la red',
      live: 'RED ACTIVA',
    },
    hero: {
      badge: 'SYS_V2.6 // CONECTA. CONSTRUYE. REMOTO.',
      lines: ['Tu próximo rol', 'tech remoto', 'empieza aquí.'],
      sub: 'Ashtor.net une a profesionales de IT altamente capacitados con empresas visionarias que buscan talento remoto en cualquier parte del mundo.',
      ctaPrimary: 'Encuentra tu rol ideal',
      ctaSecondary: 'Contrata talento top',
      metrics: [
        { label: 'Vacantes Activas', value: '1,420+', note: '+18% esta semana' },
        { label: 'Tiempo de Match', value: '72h', note: 'Talento Tier-1' },
        { label: 'Presencia Global', value: '48 Países', note: '100% Remoto' },
        { label: 'Tasa de Retención', value: '96.4%', note: 'Top 3% Talento' },
      ],
    },
    marquee: [
      'Rust', 'Go', 'Kubernetes', 'Zero-Trust', 'Smart Contracts', 'DevSecOps',
      'Python AI', 'Sistemas Distribuidos', 'React', 'Pentesting',
      'Terraform', 'WebGL', 'Operaciones SOC', 'Bases de Datos Distribuidas',
    ],
    manifesto: {
      eyebrow: 'EL CREDO ASHTOR',
      title: 'Un manifiesto para la ingeniería sin fronteras',
      chapters: [
        {
          num: '01',
          tag: 'FUERZA DE TRABAJO DESCENTRALIZADA',
          title: 'Ingeniería de Élite Sin Fronteras',
          body: 'El código de alto rendimiento y la arquitectura de seguridad no entienden de fronteras. Conectamos al 3% superior de programadores y especialistas en ciberseguridad del mundo.',
        },
        {
          num: '02',
          tag: 'MOTOR DE EVALUACIÓN ESTRICTO',
          title: 'Diseño de Sistemas en Vivo y Pentesting',
          body: 'Sin trucos de palabras clave en CVs. Cada candidato supera desafíos algorítmicos a ciegas, revisiones de arquitectura en vivo y simulaciones de defensa contra amenazas zero-day.',
        },
        {
          num: '03',
          tag: 'CONTRATACIÓN DE ALTA VELOCIDAD',
          title: 'De la Solicitud al Primer Commit en 72h',
          body: 'La selección tradicional toma 45 días de entrevistas infructuosas. Ashtor entrega candidatos pre-evaluados listos para producir en menos de 72 horas.',
        },
      ],
    },
    specs: {
      eyebrow: 'DOMINIOS DE ESPECIALIZACIÓN',
      title: 'Talento de élite, mapeado a tu stack',
      sub: 'Tres dominios operativos. Una red global de ingenieros verificados.',
      cards: [
        {
          badge: 'PROTOCOLO CRÍTICO',
          title: 'Ciberseguridad y Operaciones InfoSec',
          roles: ['SOC Lead / Threat Hunter', 'AppSec y Pentester', 'Arquitecto de Seguridad Cloud (AWS/GCP)', 'Ingeniero DevSecOps', 'Especialista Zero-Trust e Identidad'],
          accent: 'emerald',
        },
        {
          badge: 'ALTA VELOCIDAD',
          title: 'Full-Stack y Sistemas Distribuidos',
          roles: ['Backend Senior (Go / Rust / Node / Python)', 'Arquitectos Frontend (React, Next, WebGL)', 'Infraestructura Cloud y SRE (K8s / Terraform)', 'Ingenieros de Bases de Datos Distribuidas', 'Desarrolladores de Plataformas AI / ML'],
          accent: 'cyan',
        },
        {
          badge: 'NIVEL ESTRATÉGICO',
          title: 'Liderazgo de Ingeniería y Escala',
          roles: ['CTO Fraccional y Full-time', 'Staff / Principal Engineers', 'VP de Ingeniería', 'Tech Leads y Scrum Masters'],
          accent: 'amber',
        },
      ],
    },
    pathways: {
      eyebrow: 'PROTOCOLO DUAL',
      title: 'Dos caminos. Una red.',
      tabs: { talent: 'Para Talento', company: 'Para Empresas' },
      talent: {
        title: 'Para Desarrolladores y Expertos en Ciberseguridad',
        steps: [
          { step: '01', title: 'Validación Técnica Rápida', desc: 'Completa un reto práctico de 45 minutos adaptado a tu especialidad.' },
          { step: '02', title: 'Definición Salarial en USD', desc: 'Establece tu tarifa en USD, modalidad de cobro y horario preferido.' },
          { step: '03', title: 'Ofertas Directas sin Intermediarios', desc: 'Sin spam de reclutadores. Recibe ofertas directas de CTOs verificados.' },
        ],
      },
      company: {
        title: 'Para Empresas y Líderes de Tecnología',
        steps: [
          { step: '01', title: 'Define tu Stack y Nivel', desc: 'Comparte tus requerimientos técnicos, normativa y presupuesto.' },
          { step: '02', title: 'Recibe 3 Perfiles Calificados', desc: 'Obtén intros en video, repositorios validados y score de seguridad en 48h.' },
          { step: '03', title: 'Periodo de Prueba de 14 Días', desc: 'Contratos globales, gestión de pagos transfronteriza y garantía de reemplazo.' },
        ],
      },
    },
    form: {
      eyebrow: 'TERMINAL DE REGISTRO',
      title: 'Inicializa tu conexión',
      sub: 'Una señal es suficiente. Dinos quién eres y la red te dirige a los matches correctos.',
      roleLabel: 'Soy...',
      roles: ['Desarrollador de Software / IT', 'Especialista en Ciberseguridad', 'Empresa / Hiring Manager'],
      name: 'Nombre Completo',
      namePh: 'ej. Alex Vance',
      email: 'Correo Profesional',
      emailPh: 'alex@ashtor.net',
      skills: 'Stack Tecnológico o Requisitos de Contratación',
      skillsPh: 'ej. Senior Golang y Kubernetes con experiencia en AWS SecOps...',
      location: 'País / Ubicación Actual',
      locationPh: 'ej. España, Argentina, México, USA...',
      submit: 'Inicializar Protocolo de Conexión',
      sending: 'Transmitiendo...',
      success: 'Conexión inicializada. Nuestro equipo te contactará en menos de 24h.',
      error: 'Transmisión fallida. Revisa los campos e inténtalo de nuevo.',
      terminal: 'ashtor_intake — v2.6 — 80×24',
    },
    footer: {
      status: 'SISTEMA OPERATIVO — NODOS SEGUROS',
      links: ['Portal de Talento', 'Hub de Clientes', 'Carta de Seguridad', 'Términos', 'Privacidad'],
      rights: '© 2026 ashtor.net — Conecta. Construye. Remoto.',
      note: 'Diseñado para la fuerza de trabajo sin fronteras.',
    },
  },
};

const LangContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState('en');
  return (
    <LangContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LangContext.Provider>
  );
};

export const useLanguage = () => useContext(LangContext);
