import tailwindAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: '0.625rem', // --radius from index.css
        md: 'calc(0.625rem - 2px)',
        sm: 'calc(0.625rem - 4px)',
        xl: 'calc(0.625rem + 4px)',
      },
      colors: {
        background: 'hsl(0, 0%, 100%)', // --background: oklch(1 0 0)
        foreground: 'hsl(0, 0%, 14.5%)', // --foreground: oklch(0.145 0 0)
        card: {
          DEFAULT: 'hsl(0, 0%, 100%)', // --card: oklch(1 0 0)
          foreground: 'hsl(0, 0%, 14.5%)', // --card-foreground: oklch(0.145 0 0)
        },
        popover: {
          DEFAULT: 'hsl(0, 0%, 100%)', // --popover: oklch(1 0 0)
          foreground: 'hsl(0, 0%, 14.5%)', // --popover-foreground: oklch(0.145 0 0)
        },
        primary: {
          DEFAULT: 'hsl(0, 0%, 20%)', // --primary: oklch(0.205 0 0)
          foreground: 'hsl(0, 0%, 98.5%)', // --primary-foreground: oklch(0.985 0 0)
        },
        secondary: {
          DEFAULT: 'hsl(0, 0%, 97%)', // --secondary: oklch(0.97 0 0)
          foreground: 'hsl(0, 0%, 20%)', // --secondary-foreground: oklch(0.205 0 0)
        },
        muted: {
          DEFAULT: 'hsl(0, 0%, 97%)', // --muted: oklch(0.97 0 0)
          foreground: 'hsl(0, 0%, 55.6%)', // --muted-foreground: oklch(0.556 0 0)
        },
        accent: {
          DEFAULT: 'hsl(0, 0%, 97%)', // --accent: oklch(0.97 0 0)
          foreground: 'hsl(0, 0%, 20%)', // --accent-foreground: oklch(0.205 0 0)
        },
        // destructive: {
        //   DEFAULT: 'hsl(24.2, 77.4%, 45.1%)', // --destructive: oklch(0.577 0.245 27.325)
        //   foreground: 'hsl(24.2, 77.4%, 45.1%)', // --destructive-foreground: oklch(0.577 0.245 27.325)
        // },
        border: 'hsl(0, 0%, 92.2%)', // --border: oklch(0.922 0 0)
        input: 'hsl(0, 0%, 92.2%)', // --input: oklch(0.922 0 0)
        ring: 'hsl(0, 0%, 70.8%)', // --ring: oklch(0.708 0 0)
        chart: {
          '1': 'hsl(35.7, 71.4%, 56.3%)', // --chart-1: oklch(0.646 0.222 41.116)
          '2': 'hsl(183.4, 28.6%, 47.8%)', // --chart-2: oklch(0.6 0.118 184.704)
          '3': 'hsl(220.9, 17.3%, 33.1%)', // --chart-3: oklch(0.398 0.07 227.392)
          '4': 'hsl(82.8, 62.7%, 74.1%)', // --chart-4: oklch(0.828 0.189 84.429)
          '5': 'hsl(65.7, 58.7%, 67.8%)', // --chart-5: oklch(0.769 0.188 70.08)
        },
      },
      spacing: {
        radius: '0.625rem',
      },
      animation: {
        shine: 'shine 3s linear infinite',
        fadeIn: 'fadeIn 0.5s ease-out',
        grid: 'grid 15s linear infinite',
        gradient: 'gradient 8s linear infinite',
        glare: 'glare 5s linear infinite',
      },
      keyframes: {
        shine: {
          to: {
            backgroundPosition: '200% center',
          },
        },
        fadeIn: {
          from: {
            opacity: '0',
            transform: 'translateY(10px)',
          },
          to: {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        grid: {
          '0%': {
            transform: 'translateY(-50%)',
          },
          '100%': {
            transform: 'translateY(0)',
          },
        },
        gradient: {
          '0%': {
            backgroundPosition: '0% 50%',
          },
          '100%': {
            backgroundPosition: '200% 50%',
          },
        },
        glare: {
          '0%': {
            backgroundPosition: '0% 0%',
          },
          '50%': {
            backgroundPosition: '100% 100%',
          },
          '100%': {
            backgroundPosition: '0% 0%',
          },
        },
      },
    },
  },
  plugins: [tailwindAnimate],
};