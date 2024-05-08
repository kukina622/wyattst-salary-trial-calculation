import {
  average_working_hours_per_month,
  guard_average_working_hours_per_month,
  guard_average_working_day_per_month,
} from "./constant.js";

export default new Vue({
    el: "#app",
    data: {
        page: 1,
        salaryCalcCondition: {
            monthName: "",
            govtMinWage: "",
            workHours: "",
            breakTime: "",
            workingDays: "",
            containHoliday: true,
        },
        salaryCalcResult: {
            minimumWage: null,
            overtimePay: null,
            totalSalary: null,
            hourlyWage: null,
            overtimePay_NoFullTimeOvertime: null,
            fullTimeOvertimePay: null,
            dailyWage: null,
            holidayPay: null,
        },
        breakTimeCalcCondition: {
            govtMinWage: "",
            workHours: "",
            workingDays: "",
            expectSalary: "",
            containHoliday: true,
        },
        breakTimeCalcResult: {
            dailyBreakTime: "",
        },
        totalWorksHoursSalaryCalcCondition: {
            govtMinWage: "",
            monthWorkHours: "",
            monthOvertimeHours: "",
            monthFullTimeOverHours: [""],
            workingDays: "",
            containHoliday: false,
        },
        totalWorksHoursSalaryCalcResult: {
            minimumWage: null,
            overtimePay: null,
            totalSalary: null,
            hourlyWage: null,
            overtimePay_NoFullTimeOvertime: null,
            fullTimeOvertimePay: null,
            dailyWage: null,
            holidayPay: null,
        }
    },
    computed: {
        // 時薪
        hourlyWage() {
            return new Decimal(this.govtMinWage).div(8).div(30);
        },
        // 最低基本工資(月)
        govtMinWage() {
            return this.computedCondition.govtMinWage?.replace(",", "") || 0;
        },
        holiday() {
            return this.computedCondition.containHoliday ? 1 : 0;
        },
        computedCondition() {
            switch (this.page) {
                case 1:
                    return this.salaryCalcCondition;
                case 2:
                    return this.breakTimeCalcCondition;
                case 3:
                    return this.totalWorksHoursSalaryCalcCondition;
            }
        },
    },
    methods: {
        onSalaryCalcSubmit() {
            const govtMinWage = parseInt(this.govtMinWage) || 0;
            const holiday = this.holiday;
            const workingDays = parseInt(this.salaryCalcCondition.workingDays) || 0;
            const totalWorkHours = this.salaryCalcCondition.workHours || 0;
            const breakTime = this.salaryCalcCondition.breakTime || 0;

            const {
                minimumWage,
                overtimePay_NoFullTimeOvertime,
                fullTimeOvertimePay,
                overtimePay,
                totalSalary,
                hourlyWage,
                dailyWage,
            } = this.salaryCalc({ govtMinWage, holiday, workingDays, totalWorkHours, breakTime });

            this.salaryCalcResult = {
                minimumWage,
                overtimePay,
                totalSalary,
                hourlyWage,
                overtimePay_NoFullTimeOvertime,
                fullTimeOvertimePay,
                dailyWage,
            };

            this.saveGovtMinWage();
        },
        onBreakTimeCalcSubmit() {
            const govtMinWage = parseInt(this.govtMinWage) || 0;
            const holiday = this.holiday;
            const workingDays = parseInt(this.breakTimeCalcCondition.workingDays) || 0;
            const totalWorkHours = this.breakTimeCalcCondition.workHours || 0;
            const expectSalary = parseInt(this.breakTimeCalcCondition.expectSalary) || 0;

            for (let breakTime = 0; breakTime < parseFloat(totalWorkHours); breakTime += 0.25) {
                const { totalSalary } = this.salaryCalc({
                    govtMinWage,
                    holiday,
                    workingDays,
                    totalWorkHours,
                    breakTime,
                });
                if (totalSalary.comparedTo(expectSalary) <= 0) {
                    this.breakTimeCalcResult.dailyBreakTime = breakTime;
                    break;
                }
            }
        },
        onTotalWorksHoursSalaryCalcSubmit() {
            const govtMinWage = parseInt(this.govtMinWage) || 0;
            const holiday = this.holiday;
            const workingDays = parseInt(this.totalWorksHoursSalaryCalcCondition.workingDays) || 0;
            const monthWorkHours = parseInt(this.totalWorksHoursSalaryCalcCondition.monthWorkHours) || 0;
            const monthOvertimeHours = parseInt(this.totalWorksHoursSalaryCalcCondition.monthOvertimeHours) || 0;
            const monthFullTimeOverHours = this.totalWorksHoursSalaryCalcCondition.monthFullTimeOverHours;

            const {
                minimumWage,
                overtimePay_NoFullTimeOvertime,
                fullTimeOvertimePay,
                overtimePay,
                totalSalary,
                hourlyWage,
                dailyWage,
            } = this.salaryCalcByMonthWorkHours({govtMinWage, holiday, workingDays, monthWorkHours, monthOvertimeHours, monthFullTimeOverHours});

            this.totalWorksHoursSalaryCalcResult = {
                minimumWage,
                overtimePay,
                totalSalary,
                hourlyWage,
                overtimePay_NoFullTimeOvertime,
                fullTimeOvertimePay,
                dailyWage,
            };
        },
        /**
         * @returns {Object}
         * @property {Decimal} minimumWage 最低基本工資
         * @property {Decimal} overtimePay_NoFullTimeOvertime 延長工時工資(不含全日加班)
         * @property {Decimal} fullTimeOvertimePay 全日加班工資
         * @property {Decimal} overtimePay 總延長工時工資
         * @property {Decimal} totalSalary 總工資
         * @property {Decimal} hourlyWage 時薪
         * @property {Decimal} dailyWage 日薪
         * @property {Decimal} holidayPay 國定假日工資
         */
        salaryCalc({ govtMinWage, holiday, workingDays, totalWorkHours, breakTime }) {
            const workHours = new Decimal(totalWorkHours).sub(breakTime).toNumber();

            // 每日正常工時
            const normalWorkHours = workHours > 10 ? 10 : workHours;

            // 每月正常工時時數
            let normalMonthWorkHours = normalWorkHours * (workingDays + this.holiday);

            // 每月正常工時時數-超過240小時以240計
            normalMonthWorkHours = normalMonthWorkHours > 240 ? 240 : normalMonthWorkHours;

            //每日加班時數
            const overtimeHourPerDay = workHours > 10 ? workHours - 10 : 0;

            // 全日加班時數
            let fullTimeOvertimeDays = workingDays - 24 < 0 ? 0 : workingDays - 24;

            // 有國定假日用23天計
            if (holiday > 0) {
                fullTimeOvertimeDays = workingDays - 23 < 0 ? 0 : workingDays - 23;
            }

            // 最低基本工資
            let resultMinimumWage;

            if (normalMonthWorkHours < 174) {
                resultMinimumWage = new Decimal(
                    240 - 174
                )
                    .times(this.hourlyWage)
                    .add(govtMinWage)
                    .div(24)
                    .div(10)
                    .times(normalMonthWorkHours);
            } else {
                resultMinimumWage = new Decimal(normalMonthWorkHours - 174)
                    .times(this.hourlyWage)
                    .add(govtMinWage);
            }

            // 延長工時工資(不含全日加班)
            const overtimeHourDays_NoFullTime = workingDays - fullTimeOvertimeDays;
            const overtimePay_NoFullTimeOvertime = new Decimal(overtimeHourPerDay)
                .times(overtimeHourDays_NoFullTime)
                .times(4)
                .div(3)
                .times(this.hourlyWage);

            // 全日加班
            let fullTimeOvertimePay = new Decimal(0);
            if (fullTimeOvertimeDays > 0) {
                const first = workHours > 2 ? 2 : workHours;
                const firstPay = new Decimal(first).times(4).div(3).times(this.hourlyWage);

                const second = workHours - first;
                console.log(second);
                let secondPay = new Decimal(0);
                if (second > 0) {
                    secondPay = new Decimal(second).times(5).div(3).times(this.hourlyWage);
                }
                fullTimeOvertimePay = firstPay.add(secondPay);
                fullTimeOvertimePay = fullTimeOvertimePay.times(fullTimeOvertimeDays)
            }

            // 試算
            const overtimePay = overtimePay_NoFullTimeOvertime.add(fullTimeOvertimePay);
            const totalSalary = resultMinimumWage.add(overtimePay);
            const resultHourlyWage = totalSalary.div(workingDays).div(workHours);
            const dailyWage = totalSalary.div(workingDays);

            return {
                minimumWage: resultMinimumWage.toDecimalPlaces(3),
                overtimePay_NoFullTimeOvertime: overtimePay_NoFullTimeOvertime.toDecimalPlaces(3),
                fullTimeOvertimePay: fullTimeOvertimePay.toDecimalPlaces(3),
                hourlyWage: resultHourlyWage.toDecimalPlaces(3),
                overtimePay: overtimePay.toDecimalPlaces(3),
                totalSalary: totalSalary.toDecimalPlaces(3),
                dailyWage: dailyWage.toDecimalPlaces(3),
            };
        },

        /**
         * @returns {Object}
         * @property {Decimal} minimumWage 最低基本工資
         * @property {Decimal} overtimePay_NoFullTimeOvertime 延長工時工資(不含全日加班)
         * @property {Decimal} overtimePay 總延長工時工資
         * @property {Decimal} totalSalary 總工資
         * @property {Decimal} hourlyWage 時薪
         * @property {Decimal} dailyWage 日薪
         */
        salaryCalcByMonthWorkHours({ govtMinWage, holiday, workingDays, monthWorkHours, monthOvertimeHours, monthFullTimeOverHours = [] }) {

            monthWorkHours = 
                monthWorkHours - 
                monthOvertimeHours - 
                monthFullTimeOverHours.reduce((acc, cur) => acc + (parseInt(cur) || 0), 0);

            let normalMonthWorkHours = monthWorkHours > 240 ? 240 : monthWorkHours;
            if (holiday > 0) {
                normalMonthWorkHours += 10;
            }

            // 最低基本工資
            let resultMinimumWage;

            if (normalMonthWorkHours < 174) {
                resultMinimumWage = new Decimal(
                    240 - 174
                )
                    .times(this.hourlyWage)
                    .add(govtMinWage)
                    .div(24)
                    .div(10)
                    .times(normalMonthWorkHours);
            } else {
                resultMinimumWage = new Decimal(normalMonthWorkHours - 174)
                    .times(this.hourlyWage)
                    .add(govtMinWage);
            }

            // 延長工時時數(不含全日加班)
            const overtimePay_NoFullTimeOvertime = new Decimal(monthOvertimeHours)
                .times(4)
                .div(3)
                .times(this.hourlyWage);

            // 全日加班天數
            let fullTimeOvertimePay = new Decimal(0);
            
            for (const _hour of monthFullTimeOverHours) {
                const hour = parseInt(_hour) || 0;
                if (hour > 0) {
                    const first = hour > 2 ? 2 : hour;
                    const firstPay = new Decimal(first).times(4).div(3).times(this.hourlyWage);

                    const second = hour - first;
                    let secondPay = new Decimal(0);
                    if (second > 0) {
                        secondPay = new Decimal(second).times(5).div(3).times(this.hourlyWage);
                    }
                    fullTimeOvertimePay = fullTimeOvertimePay.add(firstPay).add(secondPay);
                }
            }

            // 試算
            const overtimePay = overtimePay_NoFullTimeOvertime.add(fullTimeOvertimePay);
            const totalSalary = resultMinimumWage.add(overtimePay);
            const dailyWage = totalSalary.div(workingDays);
            const hourlyWage = totalSalary.div(monthWorkHours);

            return {
                minimumWage: resultMinimumWage.ceil(),
                overtimePay_NoFullTimeOvertime: overtimePay_NoFullTimeOvertime.ceil(),
                overtimePay: overtimePay.ceil(),
                hourlyWage: hourlyWage.ceil(),
                totalSalary: totalSalary.ceil(),
                dailyWage: dailyWage.ceil(),
                fullTimeOvertimePay: fullTimeOvertimePay.ceil(),
            };
        },
        
        saveGovtMinWage() {
            localStorage.setItem("govtMinWage", this.govtMinWage);
        },
        getGovtMinWage() {
            return localStorage.getItem("govtMinWage") ?? "";
        },
        addFullTimeOverHours() {
            this.totalWorksHoursSalaryCalcCondition.monthFullTimeOverHours.push("");
        }
    },
    mounted() {
        const govtMinWage = this.getGovtMinWage();
        this.breakTimeCalcCondition.govtMinWage = govtMinWage;

        //this.salaryCalcCondition.govtMinWage = govtMinWage;
        this.salaryCalcCondition.govtMinWage = new URLSearchParams(window.location.search).get('govtMinWage');
        this.salaryCalcCondition.workHours = new URLSearchParams(window.location.search).get('workHours');
        this.salaryCalcCondition.breakTime = new URLSearchParams(window.location.search).get('breakTime');
        this.salaryCalcCondition.workingDays = new URLSearchParams(window.location.search).get('workingDays');
        this.salaryCalcCondition.containHoliday = new URLSearchParams(window.location.search).get('containHoliday');
        this.salaryCalcCondition.containHoliday = this.salaryCalcCondition.containHoliday > 0 ? true : false;

        let auto = new URLSearchParams(window.location.search).get('auto');
        if (auto) {
            this.onSalaryCalcSubmit();
        }
    },
    watch: {
        page() {
            this.$nextTick(() => {
                $('[data-toggle="tooltip"]').tooltip();
            });
        }
    }
});
