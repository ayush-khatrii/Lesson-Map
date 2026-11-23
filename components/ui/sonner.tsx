"use client";

import {
  CircleCheckIcon,
  CircleXIcon,
  InfoIcon,
  Loader2Icon,
  TriangleAlertIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import "./sonner.css";

const Toaster = ({ toastOptions, ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      className="lessonmap-toaster"
      position="top-center"
      closeButton
      duration={5000}
      gap={12}
      visibleToasts={3}
      offset={24}
      mobileOffset={16}
      icons={{
        success: <CircleCheckIcon aria-hidden="true" size={20} />,
        error: <CircleXIcon aria-hidden="true" size={20} />,
        info: <InfoIcon aria-hidden="true" size={20} />,
        warning: <TriangleAlertIcon aria-hidden="true" size={20} />,
        loading: <Loader2Icon aria-hidden="true" size={20} className="animate-spin motion-reduce:animate-none" />,
      }}
      toastOptions={{
        ...toastOptions,
        unstyled: true,
        closeButtonAriaLabel: "Dismiss notification",
        classNames: {
          ...toastOptions?.classNames,
          toast: "lessonmap-toast",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
