
import React from "react";

export const WhatYouWillFindSection = (): JSX.Element => {
  const features = [
    {
      title: "Alumni Directory",
      description: "Find and connect with classmates, seniors, juniors, and faculty across batches. Search by batch, location, industry, or interests.",
      isLeft: true
    },
    {
      title: "Events & Webinars", 
      description: "Never miss an opportunity to be part of the TKS family again. Event calendar with upcoming reunions, webinars, and networking sessions.",
      isLeft: false
    },
    {
      title: "Networking & Forums",
      description: "A space to grow professionally and personally, together. Discussion forums around themes like Careers, Mentorship, Higher Studies.",
      isLeft: true
    },
    {
      title: "Messaging",
      description: "Reconnect privately and meaningfully with your peers. Asynchronous messaging within the portal for alumni-to-alumni conversations.",
      isLeft: false
    }
  ];

  return (
    <div className="space-y-12 max-w-6xl mx-auto">
      {features.map((feature, index) => (
        <div 
          key={index} 
          className={`flex items-center gap-8 ${feature.isLeft ? 'flex-row' : 'flex-row-reverse'}`}
        >
          {/* Content */}
          <div className="flex-1 space-y-4">
            <h3 className="font-['Poppins'] font-semibold text-black text-2xl">
              {feature.title}
            </h3>
            <p className="font-['Poppins'] font-normal text-black text-lg leading-relaxed">
              {feature.description}
            </p>
          </div>
          
          {/* Illustration Placeholder */}
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-[400px] h-[250px] bg-[#a6ce39] rounded-[10px] flex items-center justify-center">
              <span className="font-['Poppins'] font-medium text-black text-xl text-center">
                GIF Displaying the respective screen
              </span>
            </div>
          </div>
          
          {/* Navigation Dots */}
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3].map((dotIndex) => (
              <div
                key={dotIndex}
                className={`w-4 h-4 rounded-full ${
                  dotIndex === index ? 'bg-[#008060]' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
