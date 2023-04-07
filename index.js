import {
  month_name_list,
  average_working_hours_per_month
} from "./constant.js";

export default new Vue({
  el: "#app",
  data: {
    salaryCalcCondition: {
      monthName: "",
      minimumWage: "",
      workHours: "",
      breakTime: "",
      workingDays: "",
      containHoliday: true
    },
    salaryCalcResult: {
      minimumWage: null,
      overtimePay: null,
      totalSalary: null,
      hourlyWage: null
    }
  },
  computed: {
    hourlyWage() {
      return new Decimal(this.salaryCalcCondition.minimumWage)
        .div(8)
        .div(30);
    },
    month() {
      return month_name_list.indexOf(this.salaryCalcCondition.monthName) + 1;
    },
    minimumWage() {
      return this.salaryCalcCondition.minimumWage.replace(",", "");
    },
    holiday() {
      return this.salaryCalcCondition.containHoliday ? 1 : 0
    }
  },
  methods: {
    salaryCalc() {
      this.clearResult();
      const minimumWage = parseInt(this.minimumWage) || 0;
      const holiday = this.holiday
      const workingDays = parseInt(this.salaryCalcCondition.workingDays) || 0;
      const workHours = parseInt(this.salaryCalcCondition.workHours) || 0;

      const normalWorkHours = workHours > 10 ? 10 : workHours;

      // 正常工時時數
      let normalMonthWorkHours = normalWorkHours * (workingDays + holiday);
      normalMonthWorkHours = normalMonthWorkHours > 240 ? 240 : normalMonthWorkHours;

      // 加班工時時數
      const overtimeHourPerDay = workHours - 10; //每日加班時數
      const fullTimeOvertimeDays = workingDays > 23 ? workingDays - 23 : 0; //全日加班天數

      //最低基本工資
      const resultMinimumWage = new Decimal(normalMonthWorkHours - average_working_hours_per_month)
        .times(this.hourlyWage)
        .add(minimumWage);

      // 延長工時工資(不含全日加班)
      const totalOvertimeHour = workingDays > 23 ? 23 * overtimeHourPerDay : overtimeHourPerDay * workingDays;
      const overtimePay_NoFullTimeOvertime = new Decimal(totalOvertimeHour)
        .times(this.hourlyWage)
        .times(4)
        .div(3);

      // 全日加班
      let fullTimeOvertimePay = new Decimal(0);

      if (fullTimeOvertimeDays > 0) {
        fullTimeOvertimePay = this.hourlyWage
          .times(4)
          .div(3)
          .times(2)
          .add(fullTimeOvertimePay);
        
        fullTimeOvertimePay = this.hourlyWage
          .times(5)
          .div(3)
          .times(workHours - 2)
          .add(fullTimeOvertimePay);

        fullTimeOvertimePay = fullTimeOvertimePay.mul(fullTimeOvertimeDays);
      }


      console.log(fullTimeOvertimePay.toString());



      // 結果
      this.salaryCalcResult.minimumWage = resultMinimumWage.ceil();
      this.salaryCalcResult.overtimePay = overtimePay_NoFullTimeOvertime.add(fullTimeOvertimePay).ceil();
      this.salaryCalcResult.totalSalary = this.salaryCalcResult.minimumWage.add(this.salaryCalcResult.overtimePay);
      this.salaryCalcResult.hourlyWage = this.salaryCalcResult.totalSalary
        .div(workingDays)
        .div(workHours)
        .toDecimalPlaces(3);

      // 紀錄
      this.saveMinimumWage()
    },
    clearResult() {
      this.salaryCalcResult = {
        minimumWage: null,
        overtimePay: null,
        totalSalary: null,
        hourlyWage: null
      };
    },
    saveMinimumWage() {
      localStorage.setItem("minimumWage", this.minimumWage);
    },
    getMinimumWage() {
      return localStorage.getItem("minimumWage") ?? ""
    }
  },
  mounted(){
    this.salaryCalcCondition.minimumWage = this.getMinimumWage()
  }
});
