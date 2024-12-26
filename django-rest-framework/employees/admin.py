from django.contrib import admin

# Register your models here.
from .models import Employee


class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('employee_id', 'first_name', 'last_name', 'job_title')
    search_fields = ('employee_id', 'first_name', 'last_name', 'job_title')


admin.site.register(Employee, EmployeeAdmin)
