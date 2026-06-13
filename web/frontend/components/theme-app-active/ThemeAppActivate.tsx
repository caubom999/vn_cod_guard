import BannerMessage from '../banner-message/BannerMessage';

export default function ThemeAppActivate() {
  const gotoThemeActiveUrl = () => {
    // open window to activate theme app
  };

  return (
    <BannerMessage
      title={'Activate our app on your theme'}
      message={
        'Our application is still disabled in your theme. It is required to be enabled to start storefront integration.'
      }
      type="warning"
      actions={[
        {
          content: 'Activate App',
          onAction: gotoThemeActiveUrl,
          variant: 'primary',
        },
      ]}
    />
  );
}
