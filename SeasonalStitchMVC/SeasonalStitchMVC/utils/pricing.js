const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

const getMaxPointsDiscount = (subtotal, availablePoints) => {
    const pointsRedeemable = Math.floor(Number(availablePoints || 0) / 100) * 100;
    const capByTotal = Math.floor(Number(subtotal || 0) / 5) * 5;
    const capByPoints = (pointsRedeemable / 100) * 5;
    return Math.min(capByTotal, capByPoints);
};

const calculatePricing = ({ baseTotal, availablePoints, usePoints, promoPercent }) => {
    const safeBase = Number(baseTotal || 0);
    const safePercent = Math.max(0, Number(promoPercent || 0));
    const promoDiscount = safePercent > 0 ? roundMoney(safeBase * (safePercent / 100)) : 0;
    const subtotal = Math.max(0, safeBase - promoDiscount);
    const maxPointsDiscount = getMaxPointsDiscount(subtotal, availablePoints);
    const pointsDiscount = usePoints ? maxPointsDiscount : 0;
    const finalTotal = roundMoney(Math.max(0, subtotal - pointsDiscount));
    const pointsRedeemed = pointsDiscount > 0 ? (pointsDiscount / 5) * 100 : 0;
    const pointsEarned = Math.floor(Math.max(0, finalTotal));

    return {
        promoDiscount,
        pointsDiscount,
        finalTotal,
        pointsRedeemed,
        pointsEarned,
        maxPointsDiscount
    };
};

module.exports = {
    calculatePricing,
    getMaxPointsDiscount
};
