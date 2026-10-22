import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { AuthPage } from '../../features/auth/AuthPage';
import { DashboardPage } from '../../features/dashboard/DashboardPage';
import { TemplatesPage } from '../../features/templates/TemplatesPage';
import { EditorPage } from '../../features/editor/EditorPage';
import { RecordsPage } from '../../features/records/RecordsPage';
import { FormsPage } from '../../features/forms/FormsPage';
import { FormSubmissionsPage } from '../../features/forms/FormSubmissionsPage';
import { PublicFormPage } from '../../features/forms/PublicFormPage';
import { AssetsPage } from '../../features/assets/AssetsPage';
import { CustomRequestsPage } from '../../features/requests/CustomRequestsPage';
import { SettingsPage } from '../../features/settings/SettingsPage';
import { InviteAcceptPage } from '../../features/auth/InviteAcceptPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <AuthPage />,
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'templates',
        element: <TemplatesPage />,
      },
      {
        path: 'records',
        element: <RecordsPage />,
      },
      {
        path: 'forms',
        element: <FormsPage />,
      },
      {
        path: 'forms/:formId/submissions',
        element: <FormSubmissionsPage />,
      },
      {
        path: 'assets',
        element: <AssetsPage />,
      },
      {
        path: 'requests',
        element: <CustomRequestsPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
  {
    path: '/editor/:templateId',
    element: <EditorPage />,
  },
  {
    path: '/form/:slug',
    element: <PublicFormPage />,
  },
  {
    path: '/invite',
    element: <InviteAcceptPage />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
