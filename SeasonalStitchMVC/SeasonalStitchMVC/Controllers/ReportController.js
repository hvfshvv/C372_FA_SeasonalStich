const Report = require('../Models/Report');

const addDays = (date, days) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
};

const toDateInputValue = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const makeRange = (startValue, endValue) => {
    const today = new Date();
    const defaultEnd = today;
    const defaultStart = addDays(today, -30);

    const startDate = startValue ? new Date(startValue) : defaultStart;
    const endDate = endValue ? new Date(endValue) : defaultEnd;

    const startText = `${toDateInputValue(startDate)} 00:00:00`;
    const endText = `${toDateInputValue(endDate)} 23:59:59`;

    return {
        start: startText,
        end: endText,
        startValue: toDateInputValue(startDate),
        endValue: toDateInputValue(endDate)
    };
};

const ReportController = {
    adminReport: (req, res) => {
        const range = makeRange(req.query.start, req.query.end);

        Report.getSalesSummary(range, (err, summaryRows) => {
            if (err) return res.status(500).send('Failed to load report');
            const summary = summaryRows && summaryRows[0] ? summaryRows[0] : {
                total_orders: 0,
                total_revenue: 0,
                avg_order_value: 0
            };

            Report.getStatusBreakdown(range, (err2, statusRows) => {
                if (err2) return res.status(500).send('Failed to load report');
                const statusCounts = statusRows || [];

                Report.getTopProducts(range, 5, (err3, topRows) => {
                    if (err3) return res.status(500).send('Failed to load report');
                    const topProducts = topRows || [];

                    Report.getLeastProducts(range, 5, (err4, leastRows) => {
                        if (err4) return res.status(500).send('Failed to load report');
                        const leastProducts = leastRows || [];

                        Report.getRefundSummary(range, (err5, refundRows) => {
                            if (err5) return res.status(500).send('Failed to load report');
                            const refund = refundRows && refundRows[0] ? refundRows[0] : {
                                requested_count: 0,
                                approved_count: 0,
                                rejected_count: 0,
                                approved_amount: 0
                            };

                            res.render('report', {
                                user: req.session.user,
                                range,
                                summary,
                                statusCounts,
                                topProducts,
                                leastProducts,
                                refund
                            });
                        });
                    });
                });
            });
        });
    }
};

module.exports = ReportController;
