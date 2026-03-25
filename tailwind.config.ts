import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
      },
      fontSize: {
        "display": ["2.5rem", { lineHeight: "1.2", fontWeight: "700" }],
        "heading": ["1.75rem", { lineHeight: "1.3", fontWeight: "600" }],
        "subheading": ["1.25rem", { lineHeight: "1.4", fontWeight: "600" }],
        "body-lg": ["1.125rem", { lineHeight: "1.6", fontWeight: "400" }],
        "body": ["1rem", { lineHeight: "1.6", fontWeight: "400" }],
        "caption": ["0.875rem", { lineHeight: "1.5", fontWeight: "400" }],
        "small": ["0.75rem", { lineHeight: "1.5", fontWeight: "400" }],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "coffee-wiggle": {
          "0%, 95%": { transform: "rotate(0deg) scale(1)" },
          "96%": { transform: "rotate(-3deg) scale(1.05)" },
          "97%": { transform: "rotate(3deg) scale(1.05)" },
          "98%": { transform: "rotate(-2deg) scale(1.03)" },
          "99%": { transform: "rotate(2deg) scale(1.03)" },
          "100%": { transform: "rotate(0deg) scale(1)" },
        },
        /* 식대비 버튼 glow 효과: 미입력 상태에서 사용자 시선 유도 */
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 hsl(var(--primary) / 0.4)" },
          "50%": { boxShadow: "0 0 12px 4px hsl(var(--primary) / 0.2)" },
        },
        /* [CL-INSIGHT-CHECK-20260315-160000] 인사이트 체크 애니메이션 */
        "insight-check-pop": {
          "0%": { transform: "scale(1)" },
          "30%": { transform: "scale(1.3)" },
          "50%": { transform: "scale(0.95)" },
          "70%": { transform: "scale(1.05)" },
          "100%": { transform: "scale(1)" },
        },
        "insight-dismiss": {
          "0%": { opacity: "1", transform: "translateX(0) scale(1)" },
          "100%": { opacity: "0", transform: "translateX(20px) scale(0.95)" },
        },
        "insight-collapse": {
          "0%": { maxHeight: "200px", marginBottom: "8px", opacity: "1" },
          "100%": { maxHeight: "0px", marginBottom: "0px", opacity: "0", padding: "0" },
        },
        /* [CL-HONEYMOON-REDESIGN-20260316] 이미지 월드컵 애니메이션 */
        "wc-slide-out-left": {
          "0%": { opacity: "1", transform: "translateX(0) scale(1)" },
          "100%": { opacity: "0", transform: "translateX(-100%) scale(0.8)" },
        },
        "wc-slide-out-right": {
          "0%": { opacity: "1", transform: "translateX(0) scale(1)" },
          "100%": { opacity: "0", transform: "translateX(100%) scale(0.8)" },
        },
        // [CL-REMOVE-OLD-PLANNER-20260325] CSS 변수로 다크모드 호환
        "wc-winner-pulse": {
          "0%": { transform: "scale(1)", boxShadow: "0 0 0 0 hsl(var(--primary) / 0.4)" },
          "50%": { transform: "scale(1.05)", boxShadow: "0 0 20px 8px hsl(var(--primary) / 0.2)" },
          "100%": { transform: "scale(1)", boxShadow: "0 0 0 0 hsl(var(--primary) / 0)" },
        },
        "wc-step-enter": {
          "0%": { opacity: "0", transform: "translateY(20px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "coffee-wiggle": "coffee-wiggle 10s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        /* [CL-INSIGHT-CHECK-20260315-160000] */
        "insight-check-pop": "insight-check-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "insight-dismiss": "insight-dismiss 0.35s ease-out forwards",
        "insight-collapse": "insight-collapse 0.3s ease-out forwards",
        /* [CL-HONEYMOON-REDESIGN-20260316] */
        "wc-slide-out-left": "wc-slide-out-left 0.4s ease-out forwards",
        "wc-slide-out-right": "wc-slide-out-right 0.4s ease-out forwards",
        "wc-winner-pulse": "wc-winner-pulse 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "wc-step-enter": "wc-step-enter 0.4s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
