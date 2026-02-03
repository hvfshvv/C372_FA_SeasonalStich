const defaultFooter = {
  instagram: "https://instagram.com/seasonalstitch",
  facebook: "https://facebook.com/seasonalstitch",
  email: "support@seasonalstitch.com",
  phone: "+65 6123 4567"
};

let footerData = { ...defaultFooter };

module.exports = {
  get() {
    return { ...footerData };
  },
  update(payload = {}) {
    footerData = {
      ...footerData,
      instagram: payload.instagram || footerData.instagram,
      facebook: payload.facebook || footerData.facebook,
      email: payload.email || footerData.email,
      phone: payload.phone || footerData.phone
    };
    return this.get();
  }
};
