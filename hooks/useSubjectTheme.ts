import { useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';

interface SubjectTheme {
  color: string;
  colorLight: string;
  colorDark: string;
  icon: string;
  iconEmoji: string;
  name: string;
  displayName: string;
}

/**
 * Custom hook to manage subject-based theming
 * Updates CSS variables and returns theme colors
 *
 * @returns Current subject theme configuration
 */
export const useSubjectTheme = (): SubjectTheme => {
  const { subjectConfig } = useAppContext();

  // Update CSS variables whenever subject changes
  useEffect(() => {
    const root = document.documentElement;

    root.style.setProperty('--subject-primary', subjectConfig.color);
    root.style.setProperty('--subject-light', subjectConfig.colorLight);
    root.style.setProperty('--subject-dark', subjectConfig.colorDark);

    // Optional: Add data attribute for CSS targeting
    root.setAttribute('data-active-subject', subjectConfig.id.toLowerCase());
  }, [subjectConfig]);

  return {
    color: subjectConfig.color,
    colorLight: subjectConfig.colorLight,
    colorDark: subjectConfig.colorDark,
    icon: subjectConfig.icon,
    iconEmoji: subjectConfig.iconEmoji,
    name: subjectConfig.name,
    displayName: subjectConfig.displayName
  };
};
