import {Injectable} from '@angular/core';
import { HttpClient } from '@angular/common/http';
@Injectable()
export class ApiService {
  constructor(private http: HttpClient) {}
  get(url) {
    return this.http.get(url);
  }

  post(url, data) {
    return this.http.post(url, data);
  }

  put(url, data) {
    return this.http.put(url, data);
  }

  delete(url) {
    return this.http.delete(url);
  }
}