import { ArrowRightIcon } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";

export const CallToActionSection = (): JSX.Element => {
  return (
    <section className="flex flex-col w-full items-start justify-center gap-5 px-4 sm:px-8 md:px-16 lg:px-32 py-8 sm:py-10 md:py-12 relative rounded-xl bg-[linear-gradient(90deg,rgba(199,234,251,0.5)_0%,rgba(207,229,174,0.5)_53%,rgba(255,249,174,0.5)_100%)]">
      <div className="flex flex-col w-full max-w-[1130px] items-start gap-5 relative">
        <h2 className="relative w-full [font-family:'Poppins',Helvetica] font-bold text-primary-green-1 text-5xl tracking-[0] leading-[normal]">
          Be part of the The Kalyani School legacy
        </h2>

        <p className="relative w-full [font-family:'Poppins',Helvetica] font-medium text-primary-black text-2xl tracking-[0] leading-[normal]">
          Join today to stay connected, network, and make an impact
        </p>
      </div>

      <Button className="inline-flex items-center justify-center gap-[30px] px-[30px] py-5 h-auto bg-primary-green-2 hover:bg-primary-green-2/90 rounded-xl">
        <span className="[font-family:'Poppins',Helvetica] font-semibold text-[#ffffff] text-5xl tracking-[0] leading-[normal]">
          JOIN THE ALUMNI PORTAL
        </span>

        <ArrowRightIcon className="w-[34px] h-[33px] text-white" />
      </Button>
    </section>
  );
};
