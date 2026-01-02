
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const UpcomingEventsSection = (): JSX.Element => {
  const events = [
    {
      title: "Annual Alumni Meet 2025",
      description: "Reconnect with old friends, share memories, and celebrate the TKS journey together. An evening filled with nostalgia, laughter, and networking.",
      date: "March 2025",
      image: "/figmaAssets/rectangle-10.png"
    },
    {
      title: "Career Guidance Webinar", 
      description: "Get insights from successful alumni about career paths, industry trends, and professional development opportunities.",
      date: "February 2025",
      image: "/figmaAssets/rectangle-12.png"
    },
    {
      title: "Batch of 2015 Reunion",
      description: "A special reunion for the Class of 2015. Come together to celebrate a decade of achievements and memories.",
      date: "April 2025", 
      image: "/figmaAssets/rectangle-14.png"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-1 gap-8 max-w-4xl mx-auto">
      {events.map((event, index) => (
        <Card key={index} className="bg-white rounded-[20px] border-2 border-[#008060] overflow-hidden">
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row">
              {/* Event Image */}
              <div className="md:w-1/3">
                <img
                  src={event.image}
                  alt={event.title}
                  className="w-full h-[200px] md:h-[250px] object-cover"
                />
              </div>
              
              {/* Event Content */}
              <div className="md:w-2/3 p-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <h3 className="font-['Poppins'] font-semibold text-[#008060] text-2xl">
                    {event.title}
                  </h3>
                  <p className="font-['Poppins'] font-medium text-black text-lg leading-relaxed">
                    {event.description}
                  </p>
                  <p className="font-['Poppins'] font-semibold text-black text-lg">
                    Date: {event.date}
                  </p>
                </div>
                
                <div className="mt-6 space-y-2">
                  <Button className="w-full md:w-[200px] h-[50px] bg-black text-white rounded-[10px] font-['Poppins'] font-medium text-xl hover:bg-gray-800">
                    Register
                  </Button>
                  <p className="text-center md:text-left font-['Poppins'] font-normal text-black text-base underline cursor-pointer hover:text-gray-600">
                    Register / Login to see more details
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
