const Footer = () => {
  const currentYear = new Date().getFullYear();
  return (
    <div className="border-t border-border py-4 sm:py-5">
      <p className="text-xs sm:text-sm text-muted-foreground text-center">
        ©{currentYear} Copyright by P-Hayashi. All rights reserved.
      </p>
    </div>
  );
};

export default Footer;
