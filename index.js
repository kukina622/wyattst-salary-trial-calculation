import {
  average_working_hours_per_month,
  guard_average_working_hours_per_month,
  guard_average_working_day_per_month
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
      const totalWorkHours = parseInt(this.salaryCalcCondition.workHours) || 0;
      const breakTime = parseInt(this.salaryCalcCondition.breakTime) || 0;

      const {
        minimumWage,
        overtimePay_NoFullTimeOvertime,
        fullTimeOvertimePay,
        overtimePay,
        totalSalary,
        hourlyWage,
      } = this.salaryCalc({ govtMinWage, holiday, workingDays, totalWorkHours, breakTime });

      this.salaryCalcResult = {
        minimumWage,
        overtimePay,
        totalSalary,
        hourlyWage,
        overtimePay_NoFullTimeOvertime,
        fullTimeOvertimePay,
      };

      this.saveGovtMinWage();
    },
    onBreakTimeCalcSubmit() {
      const govtMinWage = parseInt(this.govtMinWage) || 0;
      const holiday = this.holiday;
      const workingDays = parseInt(this.breakTimeCalcCondition.workingDays) || 0;
      const totalWorkHours = parseInt(this.breakTimeCalcCondition.workHours) || 0;
      const expectSalary = parseInt(this.breakTimeCalcCondition.expectSalary) || 0;

      for (let breakTime = 0; breakTime < totalWorkHours; breakTime+=0.25) {
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
     */
    salaryCalc({ govtMinWage, holiday, workingDays, totalWorkHours, breakTime }) {
      const workHours = totalWorkHours - breakTime;

      const normalWorkHours = workHours > 10 ? 10 : workHours;

      // 正常工時時數
      let normalMonthWorkHours = normalWorkHours * (workingDays + holiday);

      // 加班工時時數
      const overtimeHourPerDay = workHours > 10 ? workHours - 10 : 0; //每日加班時數

      // 全日加班時數
      // 假設每天沒加班
      let fullTimeOvertimeHours = normalMonthWorkHours > 240 ? normalMonthWorkHours - 240 : 0;
      let fullTimeOvertimeDays = Math.floor(fullTimeOvertimeHours / workHours);

      // 假如每天有加班
      // 全日加班 = 工時*全日加班天數
      if (overtimeHourPerDay > 0) {
        fullTimeOvertimeDays = (normalMonthWorkHours - 240) / 10;
        fullTimeOvertimeHours = workHours * fullTimeOvertimeDays;
      }

      // 超過240小時以240計
      normalMonthWorkHours = normalMonthWorkHours > 240 ? 240 : normalMonthWorkHours;

      //最低基本工資
      let resultMinimumWage;

      if (normalMonthWorkHours < average_working_hours_per_month) {
        resultMinimumWage = new Decimal(guard_average_working_hours_per_month - average_working_hours_per_month)
          .times(this.hourlyWage)
          .add(govtMinWage)
          .div(guard_average_working_day_per_month)
          .div(10)
          .times(normalMonthWorkHours)
  
      } else {
        resultMinimumWage = new Decimal(normalMonthWorkHours - average_working_hours_per_month)
          .times(this.hourlyWage)
          .add(govtMinWage)
      }

      // 延長工時工資(不含全日加班)
      const totalOvertimeHour =
        fullTimeOvertimeHours > 0
          ? (workingDays - fullTimeOvertimeDays) * overtimeHourPerDay
          : overtimeHourPerDay * workingDays;

      const overtimePay_NoFullTimeOvertime = new Decimal(totalOvertimeHour)
        .times(this.hourlyWage)
        .times(4)
        .div(3);

      // 全日加班
      let fullTimeOvertimePay = new Decimal(0);

      // 假設前一天有加班
      if (fullTimeOvertimeHours % workHours !== 0) {
        const first = fullTimeOvertimeHours % workHours;
        if (first > 2) {
          fullTimeOvertimePay = this.hourlyWage.times(4).div(3).times(2).add(fullTimeOvertimePay);
          fullTimeOvertimePay = this.hourlyWage
            .times(5)
            .div(3)
            .times(first - 2)
            .add(fullTimeOvertimePay);
        } else {
          fullTimeOvertimePay = this.hourlyWage
            .times(4)
            .div(3)
            .times(first)
            .add(fullTimeOvertimePay);
        }
      }

      if (fullTimeOvertimeDays > 0) {
        let _fullTimeOvertimePay = new Decimal(0);

        _fullTimeOvertimePay = this.hourlyWage.times(4).div(3).times(2).add(_fullTimeOvertimePay);

        _fullTimeOvertimePay = this.hourlyWage
          .times(5)
          .div(3)
          .times(workHours - 2)
          .add(_fullTimeOvertimePay);

        fullTimeOvertimePay = _fullTimeOvertimePay
          .mul(fullTimeOvertimeDays)
          .add(fullTimeOvertimePay);
      }

      // 結果
      const overtimePay = overtimePay_NoFullTimeOvertime.add(fullTimeOvertimePay).ceil();
      const totalSalary = resultMinimumWage.add(overtimePay).ceil();
      const resultHourlyWage = totalSalary.div(workingDays).div(workHours).toDecimalPlaces(3);

      return {
        minimumWage: resultMinimumWage.ceil(),
        overtimePay_NoFullTimeOvertime: overtimePay_NoFullTimeOvertime.ceil(),
        fullTimeOvertimePay: fullTimeOvertimePay.ceil(),
        hourlyWage: resultHourlyWage,
        overtimePay,
        totalSalary,
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
