import { useEffect, useRef } from "react";
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
  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;

  // Register handler once on mount — prevents listener accumulation when onClick ref changes
  useEffect(() => {
    const handler = () => onClickRef.current();
    WebApp.MainButton.onClick(handler);
    return () => {
      WebApp.MainButton.offClick(handler);
      WebApp.MainButton.hide();
    };
  }, []);

  // Update label and enabled state separately
  useEffect(() => {
    WebApp.MainButton.setText(label);
    WebApp.MainButton.show();
    if (enabled) WebApp.MainButton.enable();
    else WebApp.MainButton.disable();
  }, [label, enabled]);
}
