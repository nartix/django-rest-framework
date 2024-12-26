from rest_framework import serializers
from .models import Employee


def noDuplicatespace(value):
    return ' '.join(value.split())


class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = ['employee_id', 'first_name', 'last_name',
                  'job_title', 'created_at', 'updated_at']

    def validate_first_name(self, value):
        return noDuplicatespace(value)

    def validate_last_name(self, value):
        return noDuplicatespace(value)

    def validate_job_title(self, value):
        return noDuplicatespace(value)
