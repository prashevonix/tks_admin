
import React from "react";

export const WhyJoinSection = (): JSX.Element => {
  const benefits = [
    {
      title: "Connect",
      description: "with classmates and faculty across the globe",
      illustration: "/figmaAssets/group-19.png", // Using existing asset as placeholder
      highlightColor: "text-[#fdb913]"
    },
    {
      title: "Discover", 
      description: "opportunities for mentorship, networking, and collaboration",
      illustration: "/figmaAssets/group-20.png", // Using existing asset as placeholder
      highlightColor: "text-[#008060]"
    },
    {
      title: "Stay Updated",
      description: "with reunions, webinars, and school events", 
      illustration: "/figmaAssets/illustration.png", // Using existing asset as placeholder
      highlightColor: "text-[#a6ce39]"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
      {benefits.map((benefit, index) => (
        <div key={index} className="flex flex-col items-center text-center space-y-6">
          {/* Illustration */}
          <div className="w-full max-w-[300px] h-[200px] flex items-center justify-center bg-gray-100 rounded-lg">
            <img
              src={benefit.illustration}
              alt={benefit.title}
              className="max-w-full max-h-full object-contain"
            />
          </div>
          
          {/* Content */}
          <div className="space-y-2">
            <h3 className="font-['Inter'] font-bold text-3xl">
              <span className={`${benefit.highlightColor}`}>{benefit.title.toUpperCase()}</span>
            </h3>
            <p className="font-['Poppins'] text-black text-xl leading-relaxed">
              {benefit.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
