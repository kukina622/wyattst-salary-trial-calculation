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
  },
  computed: {
    hourlyWage() {
      return new Decimal(this.govtMinWage).div(8).div(30);
    },
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
      }
    },
  },
  methods: {
    onsalaryCalcSubmit() {
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
      let normalMonthWorkHours = normalWorkHours * workingDays;

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

      if (normalMonthWorkHours < average_working_hours_per_month) {
        resultMinimumWage = new Decimal(
          guard_average_working_hours_per_month - average_working_hours_per_month
        )
          .times(this.hourlyWage)
          .add(govtMinWage)
          .div(guard_average_working_day_per_month)
          .div(10)
          .times(normalMonthWorkHours);
      } else {
        resultMinimumWage = new Decimal(normalMonthWorkHours - average_working_hours_per_month)
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
        let secondPay = new Decimal(0);
        if (second > 0) {
          secondPay = new Decimal(second).times(5).div(3).times(this.hourlyWage);
        }
        fullTimeOvertimePay = firstPay.add(secondPay);
        fullTimeOvertimePay = fullTimeOvertimePay.times(fullTimeOvertimeDays)
      }

      // 試算
      const overtimePay = overtimePay_NoFullTimeOvertime.add(fullTimeOvertimePay).ceil();
      const totalSalary = resultMinimumWage.add(overtimePay).ceil();
      const resultHourlyWage = totalSalary.div(workingDays).div(workHours).toDecimalPlaces(3);
      const dailyWage = totalSalary.div(workingDays).toDecimalPlaces(3);

      return {
        minimumWage: resultMinimumWage.ceil(),
        overtimePay_NoFullTimeOvertime: overtimePay_NoFullTimeOvertime.ceil(),
        fullTimeOvertimePay: fullTimeOvertimePay.ceil(),
        hourlyWage: resultHourlyWage,
        overtimePay,
        totalSalary,
        dailyWage,
      };
    },
    saveGovtMinWage() {
      localStorage.setItem("govtMinWage", this.govtMinWage);
    },
    getGovtMinWage() {
      return localStorage.getItem("govtMinWage") ?? "";
    },
  },
  mounted() {
    const govtMinWage = this.getGovtMinWage();
    this.salaryCalcCondition.govtMinWage = govtMinWage;
    this.breakTimeCalcCondition.govtMinWage = govtMinWage;
  },
});
