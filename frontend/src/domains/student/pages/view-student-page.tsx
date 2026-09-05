import * as React from 'react';
import { Box, Paper, Tab, Tabs } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { PictureAsPdfOutlined } from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import Cookies from 'js-cookie';
import { toast } from 'react-toastify';

import { TabPanel } from '@/components/tab-panel';
import { PageContentHeader } from '@/components/page-content-header';
import { StudentProfile } from '@/components/user-account-profile';

const tabs = ['Profile'];
export const ViewStudent = () => {
  const { id } = useParams();
  const [tab, setTab] = React.useState(0);
  const [isDownloading, setIsDownloading] = React.useState(false);

  React.useEffect(() => {
    setTab(0);
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, index: number) => {
    setTab(index);
  };

  // Go microservice (Problem 4): forwards this browser session's cookies +
  // CSRF token through to the Node API, so it needs the same credentials a
  // normal RTK Query call would send.
  const handleDownloadReport = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_GO_SERVICE_URL}/api/v1/students/${id}/report`, {
        credentials: 'include',
        headers: { 'x-csrf-token': Cookies.get('csrfToken') ?? '' }
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message ?? `Report generation failed (${response.status})`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `student-${id}-report.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to download report.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <Box display='flex' alignItems='center' justifyContent='space-between'>
        <PageContentHeader heading='Account Details' />
        <LoadingButton
          loading={isDownloading}
          variant='outlined'
          size='small'
          startIcon={<PictureAsPdfOutlined />}
          onClick={handleDownloadReport}
          sx={{ mb: 2 }}
        >
          Download PDF Report
        </LoadingButton>
      </Box>
      <Box component={Paper} sx={{ p: 1 }}>
        <Tabs
          variant='scrollable'
          value={tab}
          onChange={handleTabChange}
          sx={{ borderRight: 1, borderColor: 'divider' }}
        >
          {tabs.map((tab) => (
            <Tab key={tab} label={tab} />
          ))}
        </Tabs>
        <Box sx={{ display: 'flex', flexGrow: 1 }}>
          <TabPanel value={tab} index={0}>
            <StudentProfile id={id} />
          </TabPanel>
        </Box>
      </Box>
    </>
  );
};
