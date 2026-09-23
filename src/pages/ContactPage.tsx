import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Phone, Mail, Instagram, Navigation } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Person = { name: string; role: string; phone: string };

const telHref = (phone: string) => `tel:${phone.replace(/\D/g, "")}`;

/* ---------- Phone link (.tel) ---------- */
const PhoneLink = ({ phone, light = false }: { phone: string; light?: boolean }) => (
  <a
    href={telHref(phone)}
    dir="ltr"
    className={`inline-flex items-center gap-1.5 self-start text-[13px] font-medium no-underline transition-colors ${
      light ? "text-white hover:text-[#a9b7cb]" : "text-[#1b2a41] hover:text-[#3b5378]"
    }`}
  >
    {phone}
    <Phone size={13} strokeWidth={2} className={light ? "text-[#a9b7cb]" : "text-[#6b7482]"} />
  </a>
);

/* ---------- MiniCard (.cmd / .staff-card) ---------- */
type MiniCardProps = Person & { variant?: "commander" | "staff" };

const MiniCard = ({ name, role, phone, variant = "staff" }: MiniCardProps) =>
  variant === "commander" ? (
    <div className="flex flex-col rounded-[14px] bg-[#1b2a41] px-[26px] py-2.5 text-white shadow-[0_8px_24px_rgba(27,42,65,0.25)]">
      <span className="text-lg font-bold">{name}</span>
      <span className="text-[13px] text-[#a9b7cb]">{role}</span>
      <PhoneLink phone={phone} light />
    </div>
  ) : (
    <div className="flex flex-col rounded-[14px] border border-[#dfe3e8] bg-[#f8f9fb] px-5 py-2">
      <span className="text-[15px] font-bold">{name}</span>
      <span className="text-xs text-[#6b7482]">{role}</span>
      <PhoneLink phone={phone} />
    </div>
  );

/* ---------- TreeLine (.line) ---------- */
const TreeLine = ({ className = "h-3.5" }: { className?: string }) => (
  <div className={`w-0.5 bg-[#b9c1cc] ${className}`} />
);

/* ---------- Label (.label) ---------- */
const Label = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`py-0.5 text-sm font-bold ${className}`}>{children}</div>
);

/* ---------- DeptColumn (.dept / .dept-head / .branch / .leaf / .person) ---------- */
type DeptColumnProps = { title: string; people: Person[]; num?: number };

const DeptColumn = ({ title, people, num }: DeptColumnProps) => (
  <div className="flex flex-col items-center">
    <TreeLine className="hidden h-4 lg:block" />
    <div className="flex w-full flex-col rounded-[14px] bg-[#1b2a41] px-3 py-2.5 text-center text-white">
      {num !== undefined && (
        <span className="text-[11px] font-semibold text-[#a9b7cb]">{String(num).padStart(2, "0")}</span>
      )}
      <span className="text-[15px] font-bold">{title}</span>
    </div>
    <div className="mr-6 flex flex-col gap-2 self-stretch border-r-2 border-[#b9c1cc] pt-2">
      {people.map((p) => (
        <div key={p.phone + p.name} className="flex items-center">
          <div className="h-0.5 w-3.5 shrink-0 bg-[#b9c1cc]" />
          <div className="flex min-w-0 flex-1 flex-col rounded-xl bg-[#f8f9fb] px-3 py-2 shadow-[0_2px_8px_rgba(27,42,65,0.06)]">
            <span className="text-sm font-bold">{p.name}</span>
            <span className="text-xs text-[#6b7482]">{p.role}</span>
            <PhoneLink phone={p.phone} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ---------- ChannelLink (.channel) ---------- */
type ChannelProps = { href: string; icon: LucideIcon; label: string; value: string };

const ChannelLink = ({ href, icon: Icon, label, value }: ChannelProps) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-3 rounded-[14px] bg-[#f8f9fb] px-5 py-2.5 text-[#1b2a41] no-underline shadow-[0_2px_10px_rgba(27,42,65,0.06)] transition-colors hover:bg-white hover:text-[#3b5378]"
  >
    <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-[#1b2a41]">
      <Icon size={18} strokeWidth={2} className="text-white" />
    </span>
    <span>
      <span className="block text-xs text-[#6b7482]">{label}</span>
      <span className="block text-[15px] font-semibold">{value}</span>
    </span>
  </a>
);

/* ---------- Data ---------- */
const departments: { title: string; people: Person[] }[] = [
  {
    title: "מדור הכשרות מדריכים",
    people: [
      { name: "סגן טליה אלבז", role: "מפקדת", phone: "053-5330746" },
      { name: "סגם הילה קול", role: "קצינה", phone: "054-7098175" },
      { name: "סגן ליהי משעל", role: "קצינה", phone: "058-6177666" },
    ],
  },
  {
    title: "מדור קציני הדרכה",
    people: [
      { name: "סרן עמית פת", role: "מפקדת", phone: "052-3364296" },
      { name: "סגן יובל זנדני", role: "קצינה", phone: "050-6827292" },
    ],
  },
  {
    title: 'מדור רמ"די הדרכה',
    people: [
      { name: 'רס"ן יובל אלמקייס', role: "מפקדת", phone: "052-3300458" },
      { name: "סגן אביב פרנס", role: "קצינה", phone: "052-4461172" },
    ],
  },
  {
    title: "מדור הכשרות מפקדים",
    people: [
      { name: 'רס"ן רוני חלילוב טיסמן', role: "מפקדת", phone: "054-9398029" },
      { name: "סגן יערה גוס", role: "קצינה", phone: "050-6951095" },
      { name: 'אע"צ שרי ברוט', role: 'רת"ח למידה', phone: "050-301777" },
    ],
  },
  {
    title: "מדור ביקורות",
    people: [
      { name: "סרן עדן דניאל", role: 'רמ"ד ביקורות', phone: "054-9579000" },
      { name: 'אל"מ במיל\' רותם כהן גבאי', role: "ראש צוות ביקורות", phone: "052-9213581" },
    ],
  },
  {
    title: 'רמ"ד הדרכה',
    people: [{ name: 'רס"ן עינב אבידע', role: 'רמ"ד הדרכה', phone: "052-9273769" }],
  },
];

/* ---------- Page ---------- */
const ContactPage = () => {
  return (
    <div className="min-h-screen bg-[#eef0f3] font-['Heebo',sans-serif] text-[#1b2a41]">
      <Navbar />
      <div className="pt-24" dir="rtl">
        <main className="relative flex min-h-[calc(100vh-72px)] flex-col items-center px-4 py-6 sm:px-14">
          {/* .page-title */}
          <div className="mb-6 self-stretch text-right lg:absolute lg:right-14 lg:top-7 lg:mb-0 lg:self-auto">
            <h1 className="m-0 text-4xl font-extrabold leading-[1.1]">יצירת קשר</h1>
            <p className="m-0 text-[15px] text-[#6b7482]">מבנה ארגוני ודרכי התקשרות</p>
          </div>

          {/* מפקד ביה"ס */}
          <MiniCard variant="commander" name='סא"ל אורי פנקר' role='מפקד ביה"ס' phone="054-2465164" />
          <TreeLine />

          {/* מטה ביה"ס */}
          <Label className="mb-2">מטה ביה"ס</Label>
          <div className="flex flex-wrap justify-center gap-6">
            <MiniCard name='רס"ל שחר עמר' role='קה"ד ביה"ס' phone="052-8480571" />
            <MiniCard name='רס"ל אלמוג פנטו' role="קצינת קורסים" phone="052-3063631" />
          </div>
          <TreeLine />

          {/* מדורי ביה"ס */}
          <Label>מדורי ביה"ס</Label>
          <TreeLine className="h-2.5" />
          <div className="relative grid w-full grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <div className="absolute left-[8.3%] right-[8.3%] top-0 hidden h-0.5 bg-[#b9c1cc] lg:block" />
            {departments.map((d, i) => (
              <DeptColumn key={d.title} num={i + 1} title={d.title} people={d.people} />
            ))}
          </div>

          {/* .channels */}
          <div className="mt-auto flex flex-wrap justify-center gap-5 pt-4">
            <ChannelLink
              href="mailto:bethaseferlehadracha@gmail.com"
              icon={Mail}
              label='דוא"ל'
              value="bethaseferlehadracha@gmail.com"
            />
            <ChannelLink
              href="https://instagram.com/hadracha_school"
              icon={Instagram}
              label="אינסטגרם"
              value="@hadracha_school"
            />
            <ChannelLink
              href="https://waze.com/ul?q=%D7%91%D7%99%D7%AA%20%D7%94%D7%A1%D7%A4%D7%A8%20%D7%9C%D7%94%D7%93%D7%A8%D7%9B%D7%94%20%D7%A6%D7%91%D7%90%D7%99%D7%AA"
              icon={Navigation}
              label="הגעה ב-Waze"
              value="בית הספר להדרכה צבאית"
            />
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default ContactPage;
