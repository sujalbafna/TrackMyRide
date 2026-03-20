
import { User, UserCog, UserCheck, CircleUserRound, BusFront } from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Image from "next/image";

export default function Home() {
  const roles = [
    { name: "Admin", href: "/login/admin", icon: <UserCog className="w-10 h-10" />, description: "Manage buses, routes, users, and view analytics." },
    { name: "Student", href: "/login/student", icon: <User className="w-10 h-10" />, description: "Track your bus, view route info, and manage your profile." },
    { name: "Faculty", href: "/login/faculty", icon: <UserCheck className="w-10 h-10" />, description: "Mark attendance, communicate with passengers, and view route details." },
    { name: "Driver", href: "/login/driver", icon: <CircleUserRound className="w-10 h-10" />, description: "View your route, manage status, and send emergency alerts." },
    { name: "Buses", href: "/login/buses", icon: <BusFront className="w-10 h-10" />, description: "Bus terminal attendance marking system." },
  ];

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-4 lg:p-8">
      <div className="absolute inset-0">
        <Image
          src="https://i.postimg.cc/cHSwzKWH/Gemini-Generated-Image-sxtkpcsxtkpcsxtk.png"
          alt="MIT ADT University Campus"
          fill
          priority
          style={{ objectFit: 'cover' }}
        />
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm"></div>
      </div>
      <div className="relative z-10 text-center mb-10">
        <Image src="https://i.postimg.cc/9QsnrBdS/cropped-circle-image.png" alt="Logo" width={80} height={80} className="mx-auto mb-4" />
        <h1 className="text-3xl md:text-5xl font-bold font-headline text-foreground">
          MIT Art, Design & Technology
        </h1>
        <p className="text-muted-foreground mt-2 text-base md:text-lg">
          Your smart school bus transportation solution.
        </p>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          Developed And Hosted By{" "}
          <a 
            href="https://www.linkedin.com/in/sujal-bafna/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary font-semibold hover:underline"
          >
            Sujal Bafna
          </a>
        </p>
      </div>

      <div className="relative z-10 w-full max-w-5xl">
        <h2 className="text-xl md:text-2xl font-semibold text-center mb-6">Select Your Role to Login</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {roles.map((role) => (
            <Link href={role.href} key={role.name} className="group">
              <Card className="h-full bg-background/80 backdrop-blur-lg hover:shadow-xl hover:border-primary transition-all duration-300 transform hover:-translate-y-1">
                <CardHeader className="flex flex-col items-center justify-center text-center p-4">
                  <div className="p-3 bg-primary/10 rounded-full text-primary mb-3">
                    {role.icon}
                  </div>
                  <CardTitle className="text-lg font-headline">{role.name}</CardTitle>
                  <CardDescription className="text-xs mt-1">{role.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
