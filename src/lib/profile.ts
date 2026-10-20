// Who the site is about, shared by the about page and the resume

export const PERSON = {
    name: "Rodrigo",
    surname: "Galiana Pedrero",
    alias: "Filo",
    role: "Full stack web developer & DevOps",
    base: "Málaga, Spain",
    email: "yo@filoga.me",
    github: "filo-g",
};

export const STACK = [
    ["Languages", "TypeScript, JavaScript, PHP, Python, Java"],
    ["Frontend", "HTML, CSS, Astro, Tailwind CSS"],
    ["Motion/3D", "GSAP, Three.js, Curtains.js"],
    ["Backend", "Node.js, WordPress, Payload, MySQL"],
    ["Mobile", "Flutter"],
    ["DevOps", "Linux (daily driver), Docker, Git, CI/CD, Cloudflare"],
];

// Off the clock interests
export const HOBBIES = [
    "Cross-platform development",
    "Modding games and consoles",
    "Homelab: self-hosted servers and custom services",
    "Networking: home networks and VPNs",
];

export const EXPERIENCE = [
    {
        company: "Seb Creativos",
        url: "https://sebcreativos.es",
        role: "Full stack developer & DevOps",
        start: "Feb 2021",
        end: "Present",
        points: [
            "Delivered 50+ projects end to end, from custom WordPress " +
                "themes and plugins to Payload and Astro sites.",
            "Maintain and manage the company servers.",
            "Own deploys and CI/CD pipelines.",
        ],
    },
];

export const EDUCATION = [
    {
        title: "Multiplatform and Web Application Development",
        short: "DAM/DAW",
    },
    { title: "Microcomputer Systems and Networks", short: "SMR" },
];

export const LANGUAGES = [
    ["Spanish", "Native"],
    ["English", "Upper intermediate (B2)"],
];
