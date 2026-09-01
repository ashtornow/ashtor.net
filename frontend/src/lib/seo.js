import { useEffect } from 'react';
import { useLanguage } from '@/i18n';

const META = {
  en: {
    home: {
      title: 'ashtor.net — Remote Tech Recruitment | Connect. Build. Remote.',
      desc: 'Hire verified remote software engineers and cybersecurity experts, or join a global network of elite IT talent. Connect. Build. Remote.',
    },
    'talent-portal': {
      title: 'Talent Portal — Join the Remote Network | ashtor.net',
      desc: 'Join the ashtor.net talent network: verified profiles, AI matching and remote roles with global companies for engineers and security experts.',
    },
    'client-hub': {
      title: 'Client Hub — Hire Verified Remote Engineers | ashtor.net',
      desc: 'Access pre-vetted remote engineers, security specialists and tech leaders. ashtor.net matches your company with verified talent in days.',
    },
    'security-charter': {
      title: 'Security Charter — How We Protect You | ashtor.net',
      desc: 'How ashtor.net protects your data: identity verification, encrypted infrastructure and security-first operating principles.',
    },
    terms: {
      title: 'Terms of Service | ashtor.net',
      desc: 'Terms of service for using the ashtor.net remote tech recruitment platform, for both talent and hiring companies.',
    },
    privacy: {
      title: 'Privacy Policy | ashtor.net',
      desc: 'How ashtor.net collects, uses and protects personal data for candidates and companies across the platform.',
    },
    admin: {
      title: 'Command Center | ashtor.net',
      desc: 'ashtor.net internal lead management dashboard.',
      noindex: true,
    },
    welcome: {
      title: 'Access Approved | ashtor.net',
      desc: 'Your ashtor.net access has been approved. See your next steps and run your priority AI Match.',
      noindex: true,
    },
  },
  es: {
    home: {
      title: 'ashtor.net — Reclutamiento Tech Remoto | Conecta. Construye. Remoto.',
      desc: 'Contrata ingenieros de software y expertos en ciberseguridad remotos verificados, o únete a una red global de talento IT de élite.',
    },
    'talent-portal': {
      title: 'Portal de Talento — Únete a la Red Remota | ashtor.net',
      desc: 'Únete a la red de talento de ashtor.net: perfiles verificados, matching con IA y roles remotos con empresas globales.',
    },
    'client-hub': {
      title: 'Hub de Clientes — Contrata Ingenieros Remotos Verificados | ashtor.net',
      desc: 'Accede a ingenieros remotos, especialistas en seguridad y líderes tech pre-evaluados. ashtor.net conecta tu empresa con talento en días.',
    },
    'security-charter': {
      title: 'Carta de Seguridad — Cómo te Protegemos | ashtor.net',
      desc: 'Cómo ashtor.net protege tus datos: verificación de identidad, infraestructura cifrada y principios de operación security-first.',
    },
    terms: {
      title: 'Términos de Servicio | ashtor.net',
      desc: 'Términos de servicio para usar la plataforma de reclutamiento tech remoto ashtor.net, tanto para talento como para empresas.',
    },
    privacy: {
      title: 'Política de Privacidad | ashtor.net',
      desc: 'Cómo ashtor.net recopila, usa y protege los datos personales de candidatos y empresas en toda la plataforma.',
    },
    admin: {
      title: 'Command Center | ashtor.net',
      desc: 'Panel interno de gestión de leads de ashtor.net.',
      noindex: true,
    },
    welcome: {
      title: 'Acceso Aprobado | ashtor.net',
      desc: 'Tu acceso a ashtor.net fue aprobado. Mira tus siguientes pasos y ejecuta tu AI Match prioritario.',
      noindex: true,
    },
  },
};

function ensureHeadEl(selector, tag, attrs) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    document.head.appendChild(el);
  }
  return el;
}

export function usePageMeta(slug) {
  const { lang } = useLanguage();
  useEffect(() => {
    const m = (META[lang] || META.en)[slug] || META.en.home;
    document.title = m.title;
    document.documentElement.setAttribute('lang', lang);

    ensureHeadEl('meta[name="description"]', 'meta', { name: 'description' }).setAttribute('content', m.desc);
    ensureHeadEl('meta[name="robots"]', 'meta', { name: 'robots' }).setAttribute(
      'content', m.noindex ? 'noindex, nofollow' : 'index, follow'
    );
    ensureHeadEl('link[rel="canonical"]', 'link', { rel: 'canonical' }).setAttribute(
      'href', `https://ashtor.net${slug === 'home' ? '/' : `/${slug}`}`
    );
    ensureHeadEl('meta[property="og:title"]', 'meta', { property: 'og:title' }).setAttribute('content', m.title);
    ensureHeadEl('meta[property="og:description"]', 'meta', { property: 'og:description' }).setAttribute('content', m.desc);
  }, [lang, slug]);
}
