import { CVFormData } from '../types';

export const SAMPLE_CV_DATA: CVFormData = {
  personalInfo: {
    firstName: 'Moussa',
    lastName: 'Diop',
    email: 'moussa.diop@example.sn',
    phone: '+221 77 123 45 67',
    address: 'Mermoz Extension, Villa 204',
    city: 'Dakar',
    country: 'Sénégal',
    targetJob: 'Développeur Full-Stack Senior',
    linkedin: 'linkedin.com/in/moussa-diop-dakar',
    portfolio: 'moussadiop.sn'
  },
  experiences: [
    {
      id: 'exp-1',
      company: 'Gainde 2000',
      position: 'Développeur Web Lead',
      location: 'Dakar, Sénégal',
      startDate: '2022-01',
      endDate: '',
      current: true,
      description: 'Conception et développement de solutions de dématérialisation administrative pour les services publics et entreprises au Sénégal. Gestion d\'une équipe de 5 développeurs React et Node.js. Intégration des APIs de paiement mobile Wave et Orange Money.'
    },
    {
      id: 'exp-2',
      company: 'Atos Sénégal',
      position: 'Développeur Frontend React',
      location: 'Dakar, Sénégal',
      startDate: '2019-09',
      endDate: '2021-12',
      current: false,
      description: 'Développement d\'interfaces web responsives pour des institutions financières de la zone UEMOA. Optimisation des performances des applications web et réduction du temps de chargement de 40%.'
    }
  ],
  education: [
    {
      id: 'edu-1',
      institution: 'École Supérieure Polytechnique (ESP) de Dakar',
      degree: 'Master II',
      fieldOfStudy: 'Génie Logiciel & Systèmes d\'Information',
      location: 'Dakar, Sénégal',
      startDate: '2017',
      endDate: '2019',
      current: false,
      description: 'Major de promotion. Projet de fin d\'études sur l\'interopérabilité des paiements mobiles en Afrique de l\'Ouest.'
    },
    {
      id: 'edu-2',
      institution: 'Université Cheikh Anta Diop (UCAD)',
      degree: 'Licence LMD',
      fieldOfStudy: 'Mathématiques - Informatique',
      location: 'Dakar, Sénégal',
      startDate: '2014',
      endDate: '2017',
      current: false
    }
  ],
  skills: [
    {
      category: 'Développement & Tech',
      skills: ['React.js / Next.js', 'Node.js & Express', 'TypeScript', 'Tailwind CSS', 'PostgreSQL / MongoDB', 'Git & CI/CD', 'REST APIs & GraphQL']
    },
    {
      category: 'Paiement & Intégration',
      skills: ['SDK Wave', 'Orange Money API', 'Passerelle SenePay', 'Docker', 'AWS Cloud']
    },
    {
      category: 'Compétences Transversales',
      skills: ['Gestion de projet Agile/Scrum', 'Leadership d\'équipe', 'Résolution de problèmes', 'Communication stratégique']
    }
  ],
  languages: [
    { name: 'Français', level: 'Bilingue / Maternelle' },
    { name: 'Wolof', level: 'Courant' },
    { name: 'Anglais', level: 'Avancé' }
  ],
  hobbies: ['Hackathons Tech Dakar', 'Lecture High-Tech', 'Football inter-quartier', 'Mentorat Jeunes Codeurs'],
  targetSector: 'Informatique & Télécoms (Fintech / Startups)',
  targetCompany: 'Wave Sénégal',
  letterType: 'offre',
  letterInstructions: "Candidature au poste de Développeur Full-Stack Senior. Mettre en valeur mes 5 ans d'expérience dans le développement de solutions web/mobiles et l'intégration de paiements en Afrique de l'Ouest.",
  letterTone: 'Dynamique',
  templateStyle: 'moderne',
  themeColor: '#0d9488'
};
