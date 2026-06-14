import { useEffect } from "react";
import WebApp from "@twa-dev/sdk";
import { useNavigate } from "react-router-dom";

export function useBackButton(to?: string) {
  const navigate = useNavigate();
  useEffect(() => {
    WebApp.BackButton.show();
    const handler = () => (to ? navigate(to) : navigate(-1));
    WebApp.BackButton.onClick(handler);
    return () => {
      WebApp.BackButton.offClick(handler);
      WebApp.BackButton.hide();
    };
  }, [to]);
}

export function useMainButton(label: string, onClick: () => void, enabled = true) {
  useEffect(() => {
    WebApp.MainButton.setText(label);
    WebApp.MainButton.show();
    if (enabled) {
      WebApp.MainButton.enable();
    } else {
      WebApp.MainButton.disable();
    }
    WebApp.MainButton.onClick(onClick);
    return () => {
      WebApp.MainButton.offClick(onClick);
      WebApp.MainButton.hide();
    };
  }, [label, onClick, enabled]);
}
